const ResendEmailProvider = require('../../../../../core/server/services/email-service/resend-email-provider');
const sinon = require('sinon');
const assert = require('node:assert/strict');

describe('Resend Email Provider', function () {
    describe('send', function () {
        let resendClient;
        let sendStub;
        let batchSendStub;

        beforeEach(function () {
            sendStub = sinon.stub().resolves({
                data: {
                    id: 'resend-123'
                }
            });
            batchSendStub = sinon.stub().resolves({
                data: {
                    data: [
                        {id: 'resend-batch-123'}
                    ]
                }
            });

            resendClient = {
                isConfigured: () => true,
                getInstance: () => ({
                    emails: {
                        send: sendStub
                    },
                    batch: {
                        send: batchSendStub
                    }
                }),
                getBatchSize: () => 100,
                getTargetDeliveryWindow: () => 0
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('normalizes double-escaped entities in single-recipient HTML payloads', async function () {
            const provider = new ResendEmailProvider({
                resendClient,
                errorHandler: () => {}
            });

            const response = await provider.send({
                subject: 'Hi',
                html: '<p>&amp;#xC4; %%{name}%% &amp;#xA0;&amp;lt;safe&amp;gt;</p>',
                plaintext: 'Hi %%{name}%%',
                from: 'ghost@example.com',
                replyTo: 'ghost@example.com',
                emailId: '123',
                recipients: [
                    {
                        email: 'member@example.com',
                        replacements: [
                            {
                                id: 'name',
                                value: 'Jörg'
                            }
                        ]
                    }
                ],
                replacementDefinitions: [
                    {
                        id: 'name',
                        token: /%%\{name\}%%/g,
                        getValue: () => 'Jörg'
                    }
                ]
            }, {});

            assert.equal(response.id, 'resend-123');
            sinon.assert.calledOnce(sendStub);
            const email = sendStub.firstCall.args[0];
            assert.equal(email.html.includes('&amp;#'), false, 'HTML should not contain double-escaped numeric entities');
            assert.equal(email.html.includes('&amp;lt;'), false, 'HTML should not contain double-escaped named entities');
            assert.ok(email.html.includes('Ä Jörg \u00A0&lt;safe&gt;'));
        });

        it('normalizes double-escaped entities in batch HTML payloads', async function () {
            const provider = new ResendEmailProvider({
                resendClient,
                errorHandler: () => {}
            });

            const response = await provider.send({
                subject: 'Hi',
                html: '<p>&amp;#xDC; %%{name}%%</p>',
                plaintext: 'Hi %%{name}%%',
                from: 'ghost@example.com',
                emailId: '123',
                recipients: [
                    {
                        email: 'one@example.com',
                        replacements: [
                            {
                                id: 'name',
                                value: 'Müller'
                            }
                        ]
                    },
                    {
                        email: 'two@example.com',
                        replacements: [
                            {
                                id: 'name',
                                value: 'Schröder'
                            }
                        ]
                    }
                ],
                replacementDefinitions: [
                    {
                        id: 'name',
                        token: /%%\{name\}%%/g,
                        getValue: () => ''
                    }
                ]
            }, {});

            assert.equal(response.id, 'resend-batch-123');
            sinon.assert.calledOnce(batchSendStub);
            const emails = batchSendStub.firstCall.args[0];
            assert.equal(emails[0].html, '<p>Ü Müller</p>');
            assert.equal(emails[1].html, '<p>Ü Schröder</p>');
        });
    });
});
