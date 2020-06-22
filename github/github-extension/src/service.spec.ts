const proxyquire =  require('proxyquire').noCallThru();
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const testSwagger = require('../testHelpers/testSwagger.json');


describe('service', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let requestPromise: SinonStub = sandbox.stub();
	let commitToFs: SinonStub = sandbox.stub();
	let getContent: SinonStub = sandbox.stub();
	let got: SinonStub = sandbox.stub();
	let processStub: SinonStub;
	let consoleStub: SinonStub;
	let processRepo: SinonStub;
	let writeAPI4Central: SinonStub;
	let serviceGetContents: SinonStub;
	
	
	class Octokit {
		// @ts-ignore
		private config: any;
		constructor(config: any) {
			this.config = config;
		}
		
		public get rateLimit() : object {
			return {
				get: () => {}
			}
		}
		public get repos() : object {
			return {
				getContent: getContent
			}
		}
		
	}

	let Service = proxyquire('./service', {
		'./utils': {
			requestPromise,
			commitToFs,
			getIconData: () => ({})
		},
		'@octokit/rest': {
			Octokit
		},
		'@apidevtools/swagger-parser': {
			validate: () => (testSwagger)
		},
		'got': got
	});

	const okConfig = {
		gitToken: 'token',
		gitUserName: 'user',
		repo: 'repo',
		branch: 'branch',
		environmentName: 'test'
	}

	afterEach(() => {
		sandbox.restore();
		getContent.reset();
	});

	it('init: construct class ok & sets properties', () => {
		processStub = sandbox.stub(process, 'exit');
		const extension = new Service(okConfig);
		expect(processStub.callCount).to.equal(0);
		expect(extension).to.haveOwnProperty('config');
		expect(extension).to.haveOwnProperty('octokit');
	});

	it('init: error if missing required params', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		new Service();
		expect(processStub.callCount).to.equal(1);
		expect(consoleStub.lastCall.args[0].startsWith('Missing required config')).to.be.true;
	});

	it('generateResources: calls processRepo', async () => {
		processRepo = sandbox.stub(Service.prototype, 'processRepo');
		processRepo.resolves();
		const service = new Service(okConfig);
		await service.generateResources();
		expect(processRepo.callCount).to.equal(1);
		expect(processRepo.lastCall.args).to.deep.equal([
			"user",
			"repo",
			"branch",
			"",
			""
		]);
	});

	it('processRepo: processes root oas files, calls writeAPI4Central', async () => {
		const service = new Service(okConfig);
		const file = {
			type: 'file',
			name: 'petstore.json',
			download_url: 'https://petstore.swagger.io/v2/swagger.json'
		};
		getContent.resolves({
			data: [
				file
			]
		});
		serviceGetContents = sandbox.stub(Service.prototype, 'getContents')
		serviceGetContents.resolves(JSON.stringify(testSwagger));
		writeAPI4Central = sandbox.stub(Service.prototype, 'writeAPI4Central');
		writeAPI4Central.resolves();
		await service.generateResources();
		expect(writeAPI4Central.callCount).to.equal(1);
		expect(writeAPI4Central.lastCall.args[0]).to.equal('repo');
		expect(writeAPI4Central.lastCall.args[1]).to.deep.equal(file);
		expect(writeAPI4Central.lastCall.args[2]).to.deep.equal(testSwagger);
	});

	it('processRepo: handle dirs', async () => {
		const service = new Service(okConfig);
		const file = {
			type: 'dir',
			name: 'mydir',
			path: 'mydir'
		};
		getContent.onCall(0).resolves({
			data: [
				file
			]
		});
		getContent.onCall(1).resolves({
			data: [
			]
		});
		writeAPI4Central = sandbox.stub(Service.prototype, 'writeAPI4Central');
		await service.generateResources();
		expect(writeAPI4Central.callCount).to.equal(0);
	});

	it('processRepo: only handle OAS', async () => {
		const service = new Service(okConfig);
		const file = {
			type: 'file',
			name: 'package.json',
			download_url: 'https://petstore.swagger.io/v2/swagger.json'
		};
		getContent.resolves({
			data: [
				file
			]
		});
		writeAPI4Central = sandbox.stub(Service.prototype, 'writeAPI4Central');
		await service.generateResources();
		expect(writeAPI4Central.callCount).to.equal(0);
	});

	it('processRepo: exit on githut fetch error', async () => {
		processStub = sandbox.stub(process, 'exit');
		getContent.rejects('error');
		consoleStub = sandbox.stub(console, 'error');
		const service = new Service(okConfig);
		await service.generateResources();
		expect(processStub.callCount).to.equal(1);
		expect(consoleStub.callCount).to.equal(1);
	});

	it('processRepo: works with yaml', async () => {
		const service = new Service(okConfig);
		const yamlBody = fs.readFileSync(path.resolve(__dirname, '../testHelpers/testYaml.yaml'), 'utf8');
		const file = {
			type: 'file',
			name: 'petstore.yaml',
			download_url: 'https://petstore.swagger.io/v2/swagger.json'
		};
		getContent.resolves({
			data: [
				file
			]
		});
		serviceGetContents = sandbox.stub(Service.prototype, 'getContents');
		serviceGetContents.resolves(yamlBody);
		writeAPI4Central = sandbox.stub(Service.prototype, 'writeAPI4Central');
		writeAPI4Central.resolves();
		await service.generateResources();
		expect(writeAPI4Central.callCount).to.equal(1);
		expect(writeAPI4Central.lastCall.args[0]).to.equal('repo');
		expect(writeAPI4Central.lastCall.args[1]).to.deep.equal(file);
	});

	it('getContents', async () => {
		const service = new Service(okConfig);
		got.resolves({
			body: 'helloworld'
		});
		const response = await service.getContents({
			download_url: 'httpe://example.com'
		});
		expect(got.callCount).to.equal(1);
		expect(response).to.equal('helloworld');
	});

	it('writeAPI4Central', async () => {
		const service = new Service(okConfig);
		const item = {
			download_url: 'http://example.com',
			sha: 'slkfjslkj33fds',
			html_url: 'example.com'
		}
		await service.writeAPI4Central('repo', item, testSwagger);
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);
		expect(commitToFs.lastCall.args[2].length).to.equal(4);
	});
})