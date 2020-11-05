import * as os from "os";
import * as path from "path";
const fsExtra = require('fs-extra');
const nock = require('nock');
const fs = require('fs');
const mime = require('mime-types');
const utils = require('./utils');
const yaml = require('js-yaml');


describe('utils', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let outputJsonSync: SinonStub;
	let pathExistsSync: SinonStub;
	let existsSync: SinonStub;
	let readFileSync: SinonStub;
	let writeFileSync: SinonStub;
	let lookup: SinonStub;
	let writeResource: SinonStub;

	beforeEach(() => {
		outputJsonSync = sandbox.stub(fsExtra, 'outputJsonSync');
		pathExistsSync = sandbox.stub(fsExtra, 'pathExistsSync');
		existsSync = sandbox.stub(fs, 'existsSync');
		readFileSync = sandbox.stub(fs, 'readFileSync');
		lookup = sandbox.stub(mime, 'lookup');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('exports configFilePath', () => {
		let expectedPath = path.join(os.homedir(), '.axway', 'bitbucket-extension.json');
		expect(utils.configFilePath).to.equal(expectedPath)
	})

	it('ensureConfigFileExists calls ouputJsonSync', () => {
		pathExistsSync.returns(false);
		utils.ensureConfigFileExists();
		expect(outputJsonSync.called).to.be.true;
	})

	it('ensureConfigFileExists doesnt need to init file', () => {
		pathExistsSync.returns(true);
		utils.ensureConfigFileExists();
		expect(outputJsonSync.called).to.be.false;
	})

	it('requestPromise: resolves ok body', async () => {
		const expectedBody = 'well hello there';
		nock('http://example.com')
			.get('/foo')
			.reply(200, expectedBody)
		let result = await utils.requestPromise({
			method: 'GET',
			url: 'http://example.com/foo'
		})
		expect(result).to.equal(expectedBody);
	})

	it('requestPromise: rejects non 200', async () => {
		const expectedBody = 'you fail';
		let result;
		nock('http://example.com')
			.get('/foo')
			.reply(400, expectedBody)
		try {
			result = await utils.requestPromise({
				method: 'GET',
				url: 'http://example.com/foo'
			})
		} catch (e) {
			expect(e.message).to.equal(`Bad response ${expectedBody}`);
		}
		expect(result).to.equal(undefined);
	})

	it('requestPromise: rejects non unknown error', async () => {
		const expectedBody = 'you fail';
		let result;
		nock('http://example.com')
			.get('/foo')
			.delayConnection(1000)
			.reply(400, expectedBody)
		try {
			result = await utils.requestPromise({
				method: 'GET',
				url: 'http://example.com/foo',
				timeout: 500
			})
		} catch (e) {
			expect(e.message).to.equal(`Error: ESOCKETTIMEDOUT`);
		}
		expect(result).to.equal(undefined);
	})

	it('getIconData: uses supplied icon', () => {
		const classifier = (x: any) => (x.args ||[])[0] === 'foo';
		existsSync.returns(true);
		lookup.returns('image/png');
		readFileSync.returns({});
		utils.getIconData('foo');
		expect(readFileSync.getCalls()
			.filter(classifier).length
		).to.equal(1);
	})

	it('getIconData: uses default icon', () => {
		const classifier = (x: any) => (x.args ||[])[0].endsWith('bitbucket.jpg');
		existsSync.returns(false);
		lookup.returns('image/png');
		readFileSync.returns({});
		utils.getIconData('foo');
		expect(readFileSync.getCalls()
			.filter(classifier).length
		).to.equal(1);
	})

	it('createSupportResources: creates env, subdef, webhook', async () => {
		let testEnv = {
			apiVersion: 'v1alpha1',
			title: `test Environment`,
			name: 'test',
			kind: 'Environment',
			attributes: {
				createdBy: 'yaml',
				randomNum: 1
			},
			tags: [ 'axway', 'cli' ],
			spec: {
				description: `test Environment`
			}
		};
		let yamlStr = utils.createYamlStr([testEnv]);
		let expected = '' +
		'---\n' +
		'apiVersion: v1alpha1\n' +
		'title: test Environment\n' +
		'name: test\n' +
		'kind: Environment\n' +
		'attributes:\n' +
		' createdBy: yaml\n' +
		' randomNum: 1\n' +
		'tags:\n' +
		' - axway\n' +
		' - cli\n' +
		'spec:\n' +
		' description: test Environment';

		let loadedResult = yaml.safeLoad(expected);
		let loadedReturn = yaml.safeLoad(yamlStr);
		expect(loadedResult).to.deep.equal(loadedReturn);
	});

	it('writeResource: write to filepath', async () => {
		writeFileSync = sandbox.stub(fs, 'writeFileSync');
		await utils.writeResource({
			kind: 'Environment',
			name: 'MyResource'
		}, './resources', 'helloworld');
		expect(writeFileSync.lastCall.args[0]).to.equal('./resources/Environment-MyResource.yaml');
		expect(writeFileSync.lastCall.args[1]).to.equal('helloworld');
	});

	it('commitToFs: creates yaml string and calls writeResource', async () => {
		writeResource = sandbox.stub(utils, 'writeResource');
		let outputDir = './resources';
		let resource = {
			kind: 'Environment',
			name: 'MyResource'
		};
		await utils.commitToFs(resource, outputDir, [resource]);
		expect(writeResource.lastCall.args[0]).to.equal(resource);
		expect(writeResource.lastCall.args[1]).to.equal(outputDir);
		expect(writeResource.lastCall.args[2]).to.equal(
			'---\n\n' +
			'kind: Environment\n' +
			'name: MyResource\n'
		);
	})

	it('isOASExtension checks if filename patches spec', async () => {
		expect(utils.isOASExtension('petstore.json')).to.equal(true);
		expect(utils.isOASExtension('petstore.yaml')).to.equal(true);
		expect(utils.isOASExtension('petstore.yml')).to.equal(true);
		expect(utils.isOASExtension('/')).to.equal(false);
		const falsy: boolean = ["package-lock.json", "package.json", ".travis.yml", "fixup.yaml", "jpdiff.yaml"].reduce((acc: boolean, item: string) => {
			return acc || utils.isOASExtension(item)
		}, false)
		expect(falsy).to.equal(false);
	})
})