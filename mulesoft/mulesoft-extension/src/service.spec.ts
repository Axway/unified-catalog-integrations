// @ts-ignore
const proxyquire =  require('proxyquire').noCallThru();
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const testAPIs = require('../testHelpers/testAPIs.json');
const testSwagger = require('../testHelpers/testSwagger.json');
const generateResourcesTestData = require('../testHelpers/generateResourcesTestData.json');
const unzipper = require('./unzipper');


describe('service', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let requestPromise: SinonStub = sandbox.stub();
	let commitToFs: SinonStub = sandbox.stub();
	let getContents: SinonStub = sandbox.stub();
	let downloadAndUnzip: SinonStub = sandbox.stub();
	let processStub: SinonStub;
	let consoleStub: SinonStub;
	let listAPIs: SinonStub;
	let getAccessToken: SinonStub;
	let assetLinkedAPI: SinonStub;
	let getApiDetails: SinonStub;

	let Service = proxyquire('./service', {
		'./utils': {
			requestPromise,
			commitToFs,
			getIconData: () => ({})
		},
		'./unzipper': {
			downloadAndUnzip
		}
	});

	const okConfig = {
		password: 'pass',
		username: 'user',
		masterOrganizationId: 'orgid',
		environmentName: 'env'
	}

	afterEach(() => {
		sandbox.restore();
		getContents.reset();
		requestPromise.reset();
	});

	it('init: construct class ok & sets properties', () => {
		processStub = sandbox.stub(process, 'exit');
		const extension = new Service(okConfig);
		expect(processStub.callCount).to.equal(0);
		expect(extension).to.haveOwnProperty('config');
	});

	it('init: error if missing required params', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		new Service();
		expect(processStub.callCount).to.equal(1);
		expect(consoleStub.lastCall.args[0].startsWith('Missing required config')).to.be.true;
	});

	it('listAPIs calls requestPromise', async () => {
		const service = new Service(okConfig);
		await service.listAPIs('token', 1, 2, '123');
		expect(requestPromise.lastCall.args[0].url).to.equal("https://anypoint.mulesoft.com/exchange/api/v2/assets?offset=2&limit=1&masterOrganizationId=123");
	});

	it('getAccessToken calls requestPromise', async () => {
		const service = new Service(okConfig);
		await service.getAccessToken('user', 'pass');
		expect(requestPromise.lastCall.args[0].url).to.equal("https://anypoint.mulesoft.com/accounts/login");
		expect(requestPromise.lastCall.args[0].json).to.deep.equal({
			password: 'pass',
			username: 'user'
		});
	});

	it('assetLinkedAPI calls requestPromise', async () => {
		const service = new Service(okConfig);
		await service.assetLinkedAPI('token', 'orgid', 'envId', 'assetId');
		expect(requestPromise.lastCall.args[0].url).to.equal("https://anypoint.mulesoft.com/apimanager/api/v1/organizations/orgid/environments/envId/apis?assetId=assetId");
	});

	it('getAssetHomePage calls requestPromise', async () => {
		const service = new Service(okConfig);
		await service.getAssetHomePage('token', 'orgid', 'envId', 'assetId', 'v2');
		expect(requestPromise.lastCall.args[0].url).to.equal("https://anypoint.mulesoft.com/exchange/api/v1/organizations/orgid/assets/envId/assetId/v2/pages/home");
	});

	it('getApiDetails: custom file', async () => {
		requestPromise.resolves('{}');
		const service = new Service(okConfig);
		await service.getApiDetails(testAPIs.customFileAPI, '123');
		expect(requestPromise.callCount).to.equal(3);
		expect(requestPromise.getCall(0).args[0].url).to.equal(testAPIs.customFileAPI.files[0].externalLink);
		expect(requestPromise.getCall(1).args[0].url).to.equal(testAPIs.customFileAPI.icon);
		expect(requestPromise.getCall(2).args[0].url).to.equal(`https://anypoint.mulesoft.com/exchange/api/v2/assets/${testAPIs.customFileAPI.id}`);
	});

	it('getApiDetails: zipped oas', async () => {
		requestPromise.resolves('{}');
		downloadAndUnzip.resolves(JSON.stringify(testSwagger));
		const service = new Service(okConfig);
		const result = await service.getApiDetails(testAPIs.zipOAS, '123');
		expect(requestPromise.callCount).to.equal(2);
		expect(requestPromise.getCall(0).args[0].url).to.equal(testAPIs.zipOAS.icon);
		expect(requestPromise.getCall(1).args[0].url).to.equal(`https://anypoint.mulesoft.com/exchange/api/v2/assets/${testAPIs.zipOAS.id}`);
		expect(result.spec).to.equal(JSON.stringify(testSwagger));
	});

	it('getApiDetails: specFileClassifier OAS', async () => {
		requestPromise.resolves('{}');
		const service = new Service(okConfig);
		await service.getApiDetails(testAPIs.specClassOAS, '123');
		expect(requestPromise.callCount).to.equal(3);
		expect(requestPromise.getCall(0).args[0].url).to.equal(testAPIs.specClassOAS.files[0].externalLink);
		expect(requestPromise.getCall(1).args[0].url).to.equal(testAPIs.specClassOAS.icon);
		expect(requestPromise.getCall(2).args[0].url).to.equal(`https://anypoint.mulesoft.com/exchange/api/v2/assets/${testAPIs.specClassOAS.id}`);
	});

	it('getApiDetails: specFileClassifier jar', async () => {
		requestPromise.resolves('{ "instances": []}');
		const service = new Service(okConfig);
		await service.getApiDetails(testAPIs.jar, '123');
		expect(requestPromise.callCount).to.equal(3);
		expect(requestPromise.getCall(0).args[0].url).to.equal(testAPIs.jar.files[0].externalLink);
		expect(requestPromise.getCall(1).args[0].url).to.equal(testAPIs.jar.icon);
		expect(requestPromise.getCall(2).args[0].url).to.equal(`https://anypoint.mulesoft.com/exchange/api/v2/assets/${testAPIs.jar.id}`);
	});

	it('generateResources', async () => {
		getAccessToken = sandbox.stub(Service.prototype, 'getAccessToken');
		getAccessToken.resolves({ access_token: 'token' });

		listAPIs = sandbox.stub(Service.prototype, 'listAPIs');
		listAPIs.resolves(JSON.stringify([
			testAPIs.customFileAPI,
			testAPIs.zipOAS
		]));

		getApiDetails = sandbox.stub(Service.prototype, 'getApiDetails');
		getApiDetails.onCall(0).resolves(generateResourcesTestData.detailsCallZero);
		getApiDetails.onCall(1).resolves(generateResourcesTestData.detailsCallOne);

		assetLinkedAPI = sandbox.stub(Service.prototype, 'assetLinkedAPI');
		assetLinkedAPI.resolves(JSON.stringify(generateResourcesTestData.assetLinkedAPI));
		
		const service = new Service({
			...okConfig,
			generateConsumerInstances: true,
			includeMockEndpoints: true
		});
		await service.generateResources();
		expect(getAccessToken.callCount).to.equal(1);
		expect(listAPIs.callCount).to.equal(1);
		expect(getApiDetails.callCount).to.equal(2);
		expect(assetLinkedAPI.callCount).to.equal(1);
		expect(commitToFs.callCount).to.equal(2);
	});
})