const proxyquire =  require('proxyquire').noCallThru();
const testAPI = require('../testHelpers/testAPI.json');
const testSwagger = require('../testHelpers/testSwagger.json');



describe('service', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let processStub: SinonStub;
	let consoleStub: SinonStub;
	let authorize: SinonStub;
	let listAPIs: SinonStub;
	let getSwagger: SinonStub;
	let generateAssets: SinonStub;
	let requestPromise: SinonStub = sandbox.stub();
	let commitToFs: SinonStub = sandbox.stub();
	let proxyConfig = {};

	let Service = proxyquire('./service', {
		'./utils': {
			requestPromise,
			commitToFs,
			getIconData: () => ({})
		},
		'@axway/amplify-config': {
			loadConfig: () => ({
				get: () => (proxyConfig)
			})
		}
	});

	const okConfig = {
		tenantId: 'test',
		clientId: 'test',
		clientSecret: 'test',
		subscriptionId: 'test',
		resourceGroupName: 'test',
		serviceName: 'test',
		environmentName: 'test',
		filter: 'tags=unifiedcatalog, stuff=foo'
	}

	afterEach(() => {
		sandbox.restore();
		proxyConfig = {}
	});

	it('init: construct class ok & sets properties', () => {
		proxyConfig = {
			httpProxy: 'http://foo:bar@test.com:8080'
		}
		consoleStub = sandbox.stub(console, 'log');
		processStub = sandbox.stub(process, 'exit');
		const extension = new Service(okConfig);
		expect(processStub.callCount).to.equal(0);
		expect(extension).to.haveOwnProperty('log');
		expect(extension).to.haveOwnProperty('config');
		expect(extension).to.haveOwnProperty('requestSettings');
		expect(consoleStub.lastCall.args[0].startsWith('Connecting using proxy settings')).to.be.true;
	});

	it('init: error if httpProxy is non-url', () => {
		proxyConfig = {
			httpProxy: 'not a url'
		}
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		new Service(okConfig);
		expect(processStub.callCount).to.equal(1);
		expect(consoleStub.lastCall.args[0].startsWith('Could not parse proxy')).to.be.true;
	});

	it('init: error if missing required params', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		new Service();
		expect(processStub.callCount).to.equal(1);
		expect(consoleStub.lastCall.args[0].startsWith('Missing required config')).to.be.true;
	});

	it('generateResources fetches/generates', async () => {
		consoleStub = sandbox.stub(console, 'log');
		authorize = sandbox.stub(Service.prototype, '_authorize');
		authorize.returns('{ "access_token": 123 }');
		listAPIs = sandbox.stub(Service.prototype, '_listAPIs');
		listAPIs.returns('{}');
		generateAssets = sandbox.stub(Service.prototype, '_generateAssets');
		let service = new Service(okConfig);
		await service.generateResources();
		expect(authorize.callCount).to.equal(1);
		expect(listAPIs.callCount).to.equal(1);
		expect(generateAssets.callCount).to.equal(1);
	});

	it('_authorize', async () => {
		let service = new Service(okConfig);
		requestPromise.resolves('response');
		let response = await service._authorize();
		expect(response).to.equal('response');
		expect(requestPromise.lastCall.args[0])
			.to.deep.equal(service.requestSettings.azureAuth);
	});

	it('_listAPIs', async () => {
		let service = new Service(okConfig);
		requestPromise.resolves('response');
		let response = await service._listAPIs('mytoken');
		expect(response).to.equal('response');
		expect(requestPromise.lastCall.args[0])
			.to.deep.equal({
				...service.requestSettings.getAPIs,
				headers: { Authorization: `Bearer mytoken` }
			})
	});

	it('_getSwagger', async () => {
		let service = new Service(okConfig);
		requestPromise.resolves('response');
		let response = await service._getSwagger('test', 'mytoken');
		expect(response).to.equal('response');
		expect(requestPromise.lastCall.args[0])
			.to.deep.equal(service.requestSettings.getSwagger('test', 'mytoken'));
	});

	it('__generateAssets: calls commitToFs with gen resources', async () => {
		let service = new Service(okConfig);
		commitToFs.resolves(true);
		getSwagger = sandbox.stub(Service.prototype, '_getSwagger');
		getSwagger.resolves(JSON.stringify(testSwagger));
		await service._generateAssets(testAPI)
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('APIService');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);
		expect(commitToFs.lastCall.args[2][0].kind).to.equal('APIService');
		expect(commitToFs.lastCall.args[2][1].kind).to.equal('APIServiceRevision');
		expect(commitToFs.lastCall.args[2][2].kind).to.equal('APIServiceInstance');
		expect(commitToFs.lastCall.args[2][3].kind).to.equal('ConsumerInstance');
	});
})