import fs from 'fs-extra';
import { generate } from './generate';
const Service = require('../../service');
const utils = require('../../utils');

describe('resources: generate', () => {
	let mockConsole: {
		error: SinonSpy;
		log: SinonSpy;
	};
  let readJsonSync: SinonStub;
  let generateResources: SinonStub;
  let createSupportResources: SinonStub;
  let sandbox: SinonSandbox = sinon.createSandbox();

	beforeEach(() => {
		mockConsole = {
			error: sandbox.spy(),
			log: sandbox.spy(),
		};
    readJsonSync = sandbox.stub(fs, 'readJsonSync');
    generateResources = sandbox.stub(Service.prototype, 'generateResources');
    createSupportResources = sandbox.stub(utils, 'createSupportResources');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('reads config, generates resources, logs success', async () => {
    const testConfig = {
      gitToken: 'token',
      gitUserName: 'user',
      repo: 'repo',
      branch: 'branch',
      environmentName: 'test'
    }
    readJsonSync.returns(testConfig);
    generateResources.resolves();
    createSupportResources.resolves();

    await generate.action({ console: mockConsole as any })
    generateResources.calledOnceWith(testConfig);
    expect(mockConsole.log.calledTwice).to.be.true;
  })
})