#!/usr/bin/env node
/* eslint-env node, es2022 */
/**
 * Emergency admin password reset for Railway / Docker deployments.
 *
 * Runs inside the Ghost container where DB env vars and @tryghost/security
 * are already available. Does not boot Ghost or send email.
 *
 * Usage (Railway Ghost service shell):
 *   node scripts/reset-admin-password.js reset aaron@beyond925.de 'NewSecurePass1!'
 *   node scripts/reset-admin-password.js create temp-admin@beyond925.de 'NewSecurePass1!' "Temp Admin"
 *   node scripts/reset-admin-password.js set-theme source
 *
 * While SMTP is unavailable, also set in Railway:
 *   security__staffDeviceVerification=false
 */
"use strict";

const mysql = require("mysql2/promise");
const security = require("@tryghost/security");
const ObjectId = require("bson-objectid").default;

const MIN_PASSWORD_LENGTH = 10;

function usage() {
    console.error(`Usage:
  node scripts/reset-admin-password.js reset <email> <new-password>
  node scripts/reset-admin-password.js create <email> <new-password> [display-name]
  node scripts/reset-admin-password.js set-theme <theme-name>

Password must be at least ${MIN_PASSWORD_LENGTH} characters and must not contain "password" or "ghost".`);
    process.exit(1);
}

function getDbConfig() {
    const host =
        process.env.database__connection__host || process.env.MYSQLHOST;
    const port = Number(
        process.env.database__connection__port || process.env.MYSQLPORT || 3306,
    );
    const user =
        process.env.database__connection__user || process.env.MYSQLUSER;
    const dbPass =
        process.env.database__connection__password || process.env.MYSQLPASSWORD;
    const database =
        process.env.database__connection__database || process.env.MYSQLDATABASE;

    if (!host || !user || dbPass === undefined || !database) {
        console.error(
            "Missing database env vars. Expected Ghost database__connection__* variables.",
        );
        process.exit(1);
    }

    return { host, port, user, password: dbPass, database };
}

function validatePasswordInput(password, email) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        );
    }

    const lower = password.toLowerCase();
    if (
        lower.includes("password") ||
        lower.includes("ghost") ||
        lower.includes("passw0rd")
    ) {
        throw new Error('Password must not contain "password" or "ghost".');
    }

    if (email && lower === email.toLowerCase()) {
        throw new Error("Password must not match the email address.");
    }
}

function slugFromEmail(email) {
    const local = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return local || "admin";
}

async function resetPassword(connection, email, newPassword) {
    validatePasswordInput(newPassword, email);

    const [rows] = await connection.execute(
        "SELECT id, email, status FROM users WHERE email = ? LIMIT 1",
        [email],
    );

    if (!rows.length) {
        throw new Error(
            `No user found with email ${email}. Use "create" to add an emergency admin.`,
        );
    }

    const user = rows[0];
    const hash = await security.password.hash(newPassword);
    const now = new Date();

    await connection.execute(
        `UPDATE users
         SET password = ?, status = 'active', updated_at = ?
         WHERE id = ?`,
        [hash, now, user.id],
    );

    await connection.execute("DELETE FROM sessions WHERE user_id = ?", [
        user.id,
    ]);

    console.log(
        `Reset password for ${email} (id: ${user.id}, previous status: ${user.status}).`,
    );
    console.log("Cleared existing sessions for this user.");
}

async function createAdmin(connection, email, newPassword, displayName) {
    validatePasswordInput(newPassword, email);

    const [existing] = await connection.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [email],
    );

    if (existing.length) {
        throw new Error(`User ${email} already exists. Use "reset" instead.`);
    }

    const [roles] = await connection.execute(
        `SELECT id FROM roles WHERE name = 'Administrator' LIMIT 1`,
    );

    if (!roles.length) {
        throw new Error(
            "Administrator role not found. Is this database initialized?",
        );
    }

    const hash = await security.password.hash(newPassword);
    const now = new Date();
    const userId = ObjectId().toHexString();
    let slug = slugFromEmail(email);
    const name = displayName || slug;

    const [slugConflict] = await connection.execute(
        "SELECT id FROM users WHERE slug = ? LIMIT 1",
        [slug],
    );

    if (slugConflict.length) {
        slug = `${slug}-${userId.slice(-6)}`;
    }

    const rolesUsersId = ObjectId().toHexString();

    await connection.beginTransaction();

    try {
        await connection.execute(
            `INSERT INTO users (
                id, name, slug, password, email, status, visibility,
                comment_notifications, free_member_signup_notification,
                paid_subscription_started_notification, paid_subscription_canceled_notification,
                mention_notifications, recommendation_notifications, milestone_notifications,
                donation_notifications, gift_subscription_notifications,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'active', 'public', 1, 1, 1, 0, 1, 1, 1, 1, 1, ?, ?)`,
            [userId, name, slug, hash, email, now, now],
        );

        await connection.execute(
            "INSERT INTO roles_users (id, role_id, user_id) VALUES (?, ?, ?)",
            [rolesUsersId, roles[0].id, userId],
        );

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    }

    console.log(
        `Created emergency Administrator ${email} (id: ${userId}, slug: ${slug}).`,
    );
}

async function setActiveTheme(connection, themeName) {
    const [rows] = await connection.execute(
        `SELECT id FROM settings WHERE \`key\` = 'active_theme' LIMIT 1`,
    );

    const now = new Date();

    if (!rows.length) {
        const settingId = ObjectId().toHexString();
        await connection.execute(
            `INSERT INTO settings (id, \`group\`, \`key\`, value, type, created_at, updated_at)
             VALUES (?, 'theme', 'active_theme', ?, 'string', ?, ?)`,
            [settingId, themeName, now, now],
        );
    } else {
        await connection.execute(
            `UPDATE settings SET value = ?, updated_at = ? WHERE \`key\` = 'active_theme'`,
            [themeName, now],
        );
    }

    console.log(
        `Set active_theme to "${themeName}". Restart Ghost or wait for settings cache refresh.`,
    );
}

async function main() {
    const [command, arg1, arg2, arg3] = process.argv.slice(2);

    if (!command) {
        usage();
    }

    if (command === "set-theme") {
        if (!arg1) {
            usage();
        }

        const connection = await mysql.createConnection(getDbConfig());
        try {
            await setActiveTheme(connection, arg1);
            console.log(
                "Use a theme that exists under content/themes/ (e.g. source or casper after volume seed).",
            );
        } finally {
            await connection.end();
        }
        return;
    }

    const email = arg1;
    const newPassword = arg2;
    const displayName = arg3;

    if (!email || !newPassword) {
        usage();
    }

    if (command !== "reset" && command !== "create") {
        usage();
    }

    const connection = await mysql.createConnection(getDbConfig());

    try {
        if (command === "reset") {
            await resetPassword(connection, email, newPassword);
        } else {
            await createAdmin(connection, email, newPassword, displayName);
        }

        console.log("");
        console.log("Next steps:");
        console.log(
            "  1. Ensure security__staffDeviceVerification=false in Railway (blocks login email wait).",
        );
        console.log("  2. Log in at /ghost/ with the new password.");
        console.log(
            "  3. Change the password in Admin → Your profile after login.",
        );
        console.log(
            "  4. Re-enable staff device verification once mail works.",
        );
    } finally {
        await connection.end();
    }
}

main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
