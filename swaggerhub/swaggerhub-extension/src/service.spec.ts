const proxyquire = require('proxyquire').noCallThru();
const testSwagger = require('../testHelpers/testSwagger.json');


describe('service', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let processStub: SinonStub;
	let consoleStub: SinonStub;
	let _build: SinonStub;
	let _listAPIs: SinonStub;
	let getProps: SinonStub;
	let requestPromise: SinonStub = sandbox.stub();
	let commitToFs: SinonStub = sandbox.stub();
	let validate: SinonStub = sandbox.stub().returns(testSwagger);
	let proxyConfig = {};

	let Service = proxyquire('./service', {
		'./utils': {
			requestPromise,
			commitToFs,
			getIconData: () => ({})
		},
		'@apidevtools/swagger-parser': {
			validate
		},
		'@axway/amplify-config': {
			loadConfig: () => ({
				get: () => (proxyConfig)
			})
		}
	});

	const okConfig = {
		rootUrl: 'http://example.com',
		owner: 'stoda',
		environmentName: 'test',
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
		expect(extension).to.haveOwnProperty('config');
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

	it('getName returns prop type', () => {
		const service = new Service(okConfig);
		expect(service.getName({ type: 'myname' })).to.equal('myname');
		expect(service.getName({})).to.equal(undefined);
	});

	it('getValue returns url else value else NA', () => {
		const service = new Service(okConfig);
		const testUrl = 'http://example.com'
		expect(service.getValue({ url: testUrl })).to.equal(testUrl);
		expect(service.getValue({ value: 'test' })).to.equal('test');
		expect(service.getValue({})).to.equal(undefined);
	});

	it('getProps returns builds map', () => {
		const service = new Service(okConfig);
		const testAPI = {
			properties: [
				{
					type: 'Swagger',
					url: 'http://example.com'
				}
			]
		};
		const map = service.getProps(testAPI);
		expect(map.get(testAPI.properties[0].type)).to.equal(testAPI.properties[0].url);
	});

	it('_listAPIs calls requestPromise', async () => {
		const service = new Service(okConfig);
		await service._listAPIs();
		expect(requestPromise.callCount).to.equal(1);
		expect(requestPromise.lastCall.args[0]).to.deep.equal(service.requestSettings.getAPIs)
	});

	it('getEndpoint: x-oas v2', async () => {
		const service = new Service(okConfig);
		const testMap = new Map();
		testMap.set('X-OASVersion', '2.0');
		const testAPI = {
			host: 'example.com',
			schemes: [ 'https' ],
			basePath: '/test'
		}
		const result = await service.getEndpoint(testAPI, testMap);
		expect(result).to.deep.equal({
			host: testAPI.host,
			protocol: testAPI.schemes[0],
			routing: { basePath: testAPI.basePath }
		})
	});

	it('getEndpoint: non v2 OAS', async () => {
		const service = new Service(okConfig);
		const testMap = new Map();
		const testAPI = {
			host: 'example.com',
			schemes: [ 'https' ],
			basePath: '/test',
			servers: [
				{ url: 'https://example.com:8080/v1' }
			]
		}
		const result = await service.getEndpoint(testAPI, testMap);
		expect(result).to.deep.equal({
			host: testAPI.host,
			port: 8080,
			protocol: testAPI.schemes[0],
			routing: { basePath: testAPI.basePath }
		})
	});

	it('generateResources calls _listAPIs _build', async () => {
		_build = sandbox.stub(Service.prototype, '_build');
		_listAPIs = sandbox.stub(Service.prototype, '_listAPIs').returns('{}');
		const service = new Service(okConfig);
		await service.generateResources();
		expect(_build.callCount).to.equal(1);
		expect(_listAPIs.callCount).to.equal(1);
	});

	it('_build calls commitToFs with resources', async () => {
		_listAPIs = sandbox.stub(Service.prototype, '_listAPIs')
			.returns(JSON.stringify({ apis: [ testSwagger ] }));
		getProps = sandbox.stub(Service.prototype, 'getProps');
		const testMap = new Map([
			['Swagger', 'https://api.swaggerhub.com/apis/madhuri-pati/petstore/1.0.0'],
			['X-Version', '1.0.0'],
			['X-Created', '2020-06-02T23:21:38Z'],
			['X-Modified', '2020-06-02T23:21:39Z'],
			['X-Published', 'false'],
			['X-Versions', '1.0.0'],
			['X-Private', 'false'],
			['X-OASVersion', '2.0'],
			['X-Notifications', 'false']
		]);
		getProps.returns(testMap);
		const service = new Service(okConfig);
		await service.generateResources();

		expect(getProps.callCount).to.equal(1);
		expect(validate.callCount).to.equal(1);
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('APIService');
		expect(commitToFs.lastCall.args[2].length).to.equal(4);
		expect(commitToFs.lastCall.args[2][0].kind).to.equal('APIService');
		expect(commitToFs.lastCall.args[2][1].kind).to.equal('APIServiceRevision');
		expect(commitToFs.lastCall.args[2][2].kind).to.equal('APIServiceInstance');
		expect(commitToFs.lastCall.args[2][3].kind).to.equal('ConsumerInstance');
	});
})