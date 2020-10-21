const proxyquire =  require('proxyquire').noCallThru();
const testSwagger = require('../testHelpers/testSwagger.json');

describe('service', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let requestPromise: SinonStub = sandbox.stub();
	let log: SinonStub = sandbox.stub();
	let commitToFs: SinonStub = sandbox.stub();
	let processStub: SinonStub;
	let consoleStub: SinonStub;
	let _authorize: SinonStub;
	let _buildAssetParams: SinonStub;
	let _listEnvironments: SinonStub;
	let _listVirtualHostsForEnvironment: SinonStub;
	let _listVirtualHostDetailsForEnvironment: SinonStub;

	let _getVirtualHostsPerEnv: SinonStub;
	let _listAPIs: SinonStub;
	let _listAPIDeployments: SinonStub;
	let _apiResourceFiles: SinonStub;
	let _apiRevisionDetails: SinonStub;
	let _apiRevisionSpecAssociation: SinonStub;
	let _getSwagger: SinonStub;
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
		'organizationId': 'orgid',
		'username': 'user',
		'password': 'pass',
		'environmentName': 'env'
	}

	afterEach(() => {
		sandbox.restore();
		requestPromise.reset();
		proxyConfig = {};
	});

	it('init: construct class ok & sets properties', () => {
		proxyConfig = {
			httpProxy: 'http://foo:bar@test.com:8080'
		}
		consoleStub = sandbox.stub(console, 'log');
		processStub = sandbox.stub(process, 'exit');
		const extension = new Service(okConfig);
		expect(processStub.callCount).to.equal(0);
		expect(extension).to.haveOwnProperty('config');
		expect(extension.config).to.deep.equal(okConfig);
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

	it('generateResources: calls _authorize and _buildAssetParams', async () => {
		_authorize = sandbox.stub(Service.prototype, '_authorize');
		_authorize.resolves('{"access_token": 123 }');
		_buildAssetParams = sandbox.stub(Service.prototype, '_buildAssetParams');
		_buildAssetParams.resolves();
		const service = new Service(okConfig);
		await service.generateResources();
		expect(_authorize.callCount).to.equal(1);
		expect(_buildAssetParams.callCount).to.equal(1);
	});

	it('_authorize: calls requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._authorize();
		expect(requestPromise.lastCall.args[0]).to.deep.equal(service.requestSettings.apigeeAuth);
	});

	it('_getVirtualHostsPerEnv: returns hosts', async () => {
		_listEnvironments = sandbox.stub(Service.prototype, '_listEnvironments');
		_listEnvironments.resolves('["prod", "test"]');
		_listVirtualHostsForEnvironment = sandbox.stub(Service.prototype, '_listVirtualHostsForEnvironment');
		_listVirtualHostsForEnvironment.resolves('[ "default", "secure" ]');
		_listVirtualHostDetailsForEnvironment = sandbox.stub(Service.prototype, '_listVirtualHostDetailsForEnvironment');
		_listVirtualHostDetailsForEnvironment.resolves('{"hostAliases":["sebyonthenet-19519-eval-prod.apigee.net"],"interfaces":[],"listenOptions":[],"name":"default","port":"80","retryOptions":[],"useBuiltInFreeTrialCert":false}');

		const service = new Service(okConfig, log);
		const result = await service._getVirtualHostsPerEnv(123);
	
		expect(result.size).to.equal(2);
		expect(result.get('prod').length).to.equal(2);
		expect(result.get('test').length).to.equal(2);
	});

	it('_listEnvironments call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._listEnvironments();
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/environments');
	});

	it('_listVirtualHostsForEnvironment call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._listVirtualHostsForEnvironment(null, 'env');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/environments/env/virtualhosts');
	});

	it('_listVirtualHostDetailsForEnvironment call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._listVirtualHostDetailsForEnvironment(null, 'env', 'prod');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/environments/env/virtualhosts/prod');
	});

	it('_listAPIs call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._listAPIs('token');
		expect(requestPromise.callCount).to.equal(1);
		expect(requestPromise.lastCall.args[0]).to.deep.equal({
			...service.requestSettings.APIsOptions('token')
		})
	});

	it('_listAPIDeployments call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._listAPIDeployments('token', 'someAPI');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/apis/someAPI/deployments');
	});

	it('_apiResourceFiles call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._apiResourceFiles('token', 'someAPI', '1');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/apis/someAPI/revisions/1/resourcefiles');
	});

	it('_apiRevisionDetails call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._apiRevisionDetails('token', 'someAPI', '1');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/apis/someAPI/revisions/1');
	});

	it('_apiRevisionSpecAssociation call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._apiRevisionSpecAssociation('token', 'someAPI', '1', 'abcd');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://api.enterprise.apigee.com/v1/organizations/orgid/apis/someAPI/revisions/1/resourcefiles/openapi/abcd');
	});

	it('_getSwagger call requestPromise', async () => {
		const service = new Service(okConfig, log);
		await service._getSwagger('/foo.json', 'token');
		expect(requestPromise.callCount).to.equal(1);
		const lastArgs = requestPromise.lastCall.args[0];
		expect(lastArgs.method).to.equal('GET');
		expect(lastArgs.url).to.equal('https://apigee.com/foo.json');
	});

	it('_buildAssetParams generates resources and calls commitToFs', async () => {
		const newMap = new Map();
		_getVirtualHostsPerEnv = sandbox.stub(Service.prototype, '_getVirtualHostsPerEnv');
		newMap.set('prod', [{"hostAliases":["sebyonthenet-19519-eval-prod.apigee.net"],"interfaces":[],"listenOptions":[],"name":"default","port":"80","retryOptions":[],"useBuiltInFreeTrialCert":false},{"hostAliases":["sebyonthenet-19519-eval-prod.apigee.net"],"interfaces":[],"listenOptions":[],"name":"secure","port":"443","retryOptions":[],"sSLInfo":{"ciphers":[],"clientAuthEnabled":"false","enabled":"true","ignoreValidationErrors":false,"protocols":[]},"useBuiltInFreeTrialCert":true}]);
		newMap.set('test', [{"hostAliases":["sebyonthenet-19519-eval-test.apigee.net"],"interfaces":[],"listenOptions":[],"name":"default","port":"80","retryOptions":[],"useBuiltInFreeTrialCert":false},{"hostAliases":["sebyonthenet-19519-eval-test.apigee.net"],"interfaces":[],"listenOptions":[],"name":"secure","port":"443","retryOptions":[],"sSLInfo":{"ciphers":[],"clientAuthEnabled":"false","enabled":"true","ignoreValidationErrors":false,"protocols":[]},"useBuiltInFreeTrialCert":true}]);
		_getVirtualHostsPerEnv.resolves(newMap);

		_listAPIs = sandbox.stub(Service.prototype, '_listAPIs');
		_listAPIs.resolves('["music"]');

		_listAPIDeployments = sandbox.stub(Service.prototype, '_listAPIDeployments');
		_listAPIDeployments.resolves('{"environment":[{"name":"prod","revision":[{"configuration":{"basePath":"/","configVersion":"SHA-512:7c95c0c3cad6b4c2b8b1347f98901f375d73c3348edeb653f34d6e2bcafd05b22c2a60123def6dcec901db041ad0e9890a89ed7d92543542f90674f89cc5175f","steps":[]},"name":"3","server":[{"pod":{"name":"rgce1mp001-26","region":"us-central1"},"status":"deployed","type":["message-processor"],"uUID":"4a3811d5-54ec-4bd2-88d0-649a6c8cbef9"}],"state":"deployed"}]}],"name":"MusicalInstrumentsAPI","organization":"sebyonthenet-19519-eval"}');

		_apiResourceFiles = sandbox.stub(Service.prototype, '_apiResourceFiles');
		_apiResourceFiles.resolves('{"resourceFile":[{"name":"association.json","type":"openapi"}]}');

		_apiRevisionDetails = sandbox.stub(Service.prototype, '_apiRevisionDetails');
		_apiRevisionDetails.resolves('{"basepaths":["/musicalinstrumentsapi"],"configurationVersion":{"majorVersion":4,"minorVersion":0},"contextInfo":"Revision 3 of application MusicalInstrumentsAPI, in organization sebyonthenet-19519-eval","createdAt":1591072945200,"createdBy":"sebyonthenet@yahoo.com","description":"This is a sample Musical Instruments API.","displayName":"MusicalInstrumentsAPI","entityMetaDataAsProperties":{"bundle_type":"zip","lastModifiedBy":"sebyonthenet@yahoo.com","createdBy":"sebyonthenet@yahoo.com","lastModifiedAt":"1591393320710","subType":"null","createdAt":"1591072945200"},"lastModifiedAt":1591393320710,"lastModifiedBy":"sebyonthenet@yahoo.com","manifestVersion":"SHA-512:b54d3c58178e97488e745b6df7af85a10451a229b4a2bb6d1fe67832c981ef7c7518a3dcfb442acb9756ce2a4ad3e05240d5d9bdb7f344c16550c68166d0f6bf","name":"MusicalInstrumentsAPI","policies":["add-cors"],"proxies":["default"],"proxyEndpoints":["default"],"resourceFiles":{"resourceFile":[{"name":"association.json","type":"openapi"}]},"resources":["openapi://association.json"],"revision":"3","sharedFlows":[],"spec":"","targetEndpoints":["default"],"targetServers":[],"targets":["default"],"type":"Application"}');

		_apiRevisionSpecAssociation = sandbox.stub(Service.prototype, '_apiRevisionSpecAssociation');
		_apiRevisionSpecAssociation.resolves('{"url":"/dapi/api/organizations/sebyonthenet-19519-eval/specs/doc/297993/content"}');
		
		_getSwagger = sandbox.stub(Service.prototype, '_getSwagger');
		_getSwagger.resolves(JSON.stringify(testSwagger));
		const service = new Service(okConfig, log);
		await service._buildAssetParams('token', 'access_token');

		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('APIService');
		expect(commitToFs.lastCall.args[0].name).to.equal('music');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);
		expect(Array.isArray(commitToFs.lastCall.args[2])).to.equal(true);
		expect(commitToFs.lastCall.args[2][1].kind).to.equal('APIServiceRevision');
		expect(commitToFs.lastCall.args[2][1].name).to.equal('music-prod-3');

		expect(commitToFs.lastCall.args[2][2].kind).to.equal('APIServiceInstance');
		expect(commitToFs.lastCall.args[2][2].name).to.equal('music-prod-3-default');

		expect(commitToFs.lastCall.args[2][3].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[2][3].name).to.equal('music-prod-3-default');

		expect(commitToFs.lastCall.args[2][4].kind).to.equal('APIServiceInstance');
		expect(commitToFs.lastCall.args[2][4].name).to.equal('music-prod-3-secure');

		expect(commitToFs.lastCall.args[2][5].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[2][5].name).to.equal('music-prod-3-secure');
	});
})