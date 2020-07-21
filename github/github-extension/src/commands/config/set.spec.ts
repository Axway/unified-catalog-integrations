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

	it('can set known config and ignore unknowns when setting multiple config properties at once', async () => {
		let localConfig: Partial<Config> = {};
		readJsonSync.returns(localConfig);
		outputJsonSync.returns(true);
		configFilePath.value('foobarPath');
		let argv: Partial<Config> = {
			//@ts-ignore
			meh: 'foo.png',
			icon: 'foo.png'
		};

		set.action({ console: mockConsole as any, argv });
		expect(readJsonSync.calledOnce).to.be.true;
		expect(outputJsonSync.calledOnceWith('foobarPath', {icon: 'foo.png'})).to.be.true;
	})

	it('throws on unknown config', async () => {
		let localConfig: Partial<Config> = {};
		readJsonSync.returns(localConfig);
		outputJsonSync.returns(true);
		configFilePath.value('foobarPath');
		let argv: Partial<Config> = {
			//@ts-ignore
			meh: 'foo.png'
		};

		expect(() => set.action({ console: mockConsole as any, argv })).to.throw('Missing required configuration properties to set')
		expect(readJsonSync.calledOnce).to.be.false;
		expect(outputJsonSync.calledOnceWith('foobarPath', localConfig)).to.be.false;
	})
})