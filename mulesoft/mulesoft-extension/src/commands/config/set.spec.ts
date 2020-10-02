import fs from 'fs-extra';
import { Config } from "../../../types";
import * as utils from '../../utils';
import { set } from './set';

describe('config: set', () => {
	let mockConsole: {
		error: SinonSpy;
		log: SinonSpy;
	};
	let readJsonSync: SinonStub;
	let outputJsonSync: SinonStub;
	let configFilePath: SinonStub;
	let sandbox: SinonSandbox = sinon.createSandbox();

	beforeEach(() => {
		mockConsole = {
			error: sandbox.spy(),
			log: sandbox.spy(),
		};
		readJsonSync = sandbox.stub(fs, 'readJsonSync');
		outputJsonSync = sandbox.stub(fs, 'outputJsonSync');
		configFilePath = sandbox.stub(utils, 'configFilePath');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('can set known config', async () => {
		let localConfig: Partial<Config> = {};
		readJsonSync.returns(localConfig);
		outputJsonSync.returns(true);
		configFilePath.value('foobarPath');
		let argv: Partial<Config> = {
			icon: 'foo.png'
		};

		set.action({ console: mockConsole as any, argv });
		expect(readJsonSync.calledOnce).to.be.true;
		expect(outputJsonSync.calledOnceWith('foobarPath', argv)).to.be.true;
	})

	it('ignore unknown config', async () => {
		let localConfig: Partial<Config> = {};
		readJsonSync.returns(localConfig);
		outputJsonSync.returns(true);
		configFilePath.value('foobarPath');
		let argv: Partial<Config> = {
			//@ts-ignore
			meh: 'foo.png'
		};

		set.action({ console: mockConsole as any, argv });
		expect(readJsonSync.calledOnce).to.be.true;
		expect(outputJsonSync.calledOnceWith('foobarPath', localConfig)).to.be.true;
	})
})