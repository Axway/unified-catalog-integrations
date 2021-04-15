const proxyquire =  require('proxyquire').noCallThru();
import Sinon from "sinon";
import { ConfigKeys } from "../types";
const testSwagger = require('../test/testSwagger.json');
const testOas3 = require('../test/testOas3.json');
const testOas3MultipleServers = require('../test/testOas3MultipleServers.json');
const testOas3NoServers = require('../test/testOas3NoServers.json');

describe("Bitbucket service", () => {
  const sandbox = Sinon.createSandbox();
  let commitToFs: SinonStub = sandbox.stub();
  let processStub: SinonStub;
  let consoleStub: SinonStub;
  let writeSpecification: SinonStub;
  let getPage: SinonStub;
  let clientRead: SinonStub;
  let peek: SinonStub;
  let writeAPI4Central: SinonStub;
  let requestPromise: SinonStub;

  let proxyConfig:any = {};
  
  let Service = proxyquire('./service', {
    '@axway/amplify-cli-utils': {
			loadConfig: () => ({
        get: () => (proxyConfig)
      })
		}
  });

  const okConfig: { [key in ConfigKeys]?: string } = {
    branch: "master",
    environmentName: "test",
    repo: "test",
    workspace: "test",
    apiVersion: "v2",
    accessToken: '123'
  }

  afterEach(() => {
    sandbox.restore();
    proxyConfig = {};
  });

  it("init: should exit if required configurations are not provided", async () => {
    //@ts-ignore
    processStub = sandbox.stub(process, 'exit');
    consoleStub = sandbox.stub(console, 'log');
		new Service({});
    expect(processStub.callCount).to.equal(1);
    expect(consoleStub.firstCall.args[0].startsWith('Missing required config')).to.be.true;
  });

  it("init: should not exit if all required v2 configurations are provided", async () => {
    processStub = sandbox.stub(process, 'exit');
    consoleStub = sandbox.stub(console, 'log');
  
    new Service(okConfig)
    expect(processStub.callCount).to.equal(0);
  });

  it("init: should exit if username is provided without password", async () => {
    processStub = sandbox.stub(process, 'exit');
    consoleStub = sandbox.stub(console, 'log');
    new Service({
      ...okConfig,
      username: 'user'
    })
    expect(processStub.callCount).to.equal(1);
    expect(consoleStub.firstCall.args[0].includes('appPassword')).to.be.true;
  });

  it("init: should exit if password is provided without username", async () => {
    processStub = sandbox.stub(process, 'exit');
    consoleStub = sandbox.stub(console, 'log');
    new Service({
      ...okConfig,
      appPassword: 'password'
    })
    expect(processStub.callCount).to.equal(1);
    expect(consoleStub.firstCall.args[0].includes('username')).to.be.true;
  });

  it("init: should exit if apiVersion is v1 and baseUrl is not provided", async () => {
    processStub = sandbox.stub(process, 'exit');
    consoleStub = sandbox.stub(console, 'log');
    new Service({
      ...okConfig,
      apiVersion: 'v1'
    })
    expect(processStub.callCount).to.equal(1);
    expect(consoleStub.firstCall.args[0].includes('apiVersion v1 requires setting a baseUrl')).to.be.true;
  });

  it('init: construct class ok & sets proxy properties', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		proxyConfig = {
      httpProxy: "http://127.0.0.1", 
      strictSSL: false
		}
		new Service(okConfig);
	
		expect(consoleStub.firstCall.args[0].startsWith('Connecting using proxy settings')).to.be.true;
  });
  
  it('init: construct class ok & sets https proxy properties', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		proxyConfig = {
      httpsProxy: "https://test:as@127.0.0.1",
		}
		new Service(okConfig);
	
		expect(consoleStub.firstCall.args[0].startsWith('Connecting using proxy settings')).to.be.true;
  });

  it('init: construct class exit if proxy is wrong', () => {
		consoleStub = sandbox.stub(console, 'log');
		proxyConfig = {
      httpsProxy: "notAURL",
    }
    try {
      new Service(okConfig);
    } catch (error) {
      expect(error.message.startsWith('Could not parse')).to.equal(true)
    }		
  });
  
  it('init: construct class ok & sets rejectUnauthorized', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		proxyConfig = {
      strictSSL: true
		}
		new Service(okConfig);
	
		expect(consoleStub.firstCall.args[0].startsWith('Connecting using rejectUnauthorized')).to.be.true;
  });

  it('init: construct class ok & set v1 client', () => {
		const svc = new Service({
      ...okConfig,
      apiVersion: 'v1',
      baseUrl: 'http://127.0.0.1:7990/rest/api/1.0'
    });
    expect(svc.client.constructor.name).to.equal('BitBucketV1');
  });

  it('BitBucketV1: construct class ok & set proxySettings', () => {
    consoleStub = sandbox.stub(console, 'log');
    proxyConfig = {
      httpProxy: 'http://127.0.0.1:8001',
      strictSSL: false
    }

		const svc = new Service({
      ...okConfig,
      apiVersion: 'v1',
      baseUrl: 'http://127.0.0.1:7990/rest/api/1.0'
    });
    expect(svc.client.constructor.name).to.equal('BitBucketV1');
    expect(svc.client.proxySettings.strictSSL).to.deep.equal(proxyConfig.strictSSL)
    expect(svc.client.proxySettings.proxy).to.deep.equal(proxyConfig.httpProxy)
  });

  it('BitBucketV1 read: create paths and querystring', async () => {
    const baseUrl = 'http://127.0.0.1:7990/rest/api/1.0';
    const branch = 'mybranch';
    const repo_slug = 'myrepo';
    const workspace = 'myspace';
    const path = 'petstore.json';
    const start = 1;

    requestPromise = sandbox.stub().resolves({});
    let isOASExtension = sandbox.stub().returns(true)
    let Stubbed = proxyquire('./service', {
      '@axway/amplify-cli-utils': {
        loadConfig: () => ({
          get: () => (proxyConfig)
        })
      },
      './utils': {
        isOASExtension,
        requestPromise
      }
    });

		const svc = new Stubbed({
      ...okConfig,
      apiVersion: 'v1',
      baseUrl: baseUrl
    });
    await svc.client.source.read({
      branch,
      repo_slug,
      workspace,
      baseUrl,
      path,
      start
    })
    expect(svc.client.constructor.name).to.equal('BitBucketV1');
    expect(requestPromise.callCount).to.equal(1)
    expect(requestPromise.lastCall.args[0].url).equal(`${baseUrl}/projects/${workspace}/repos/${repo_slug}/raw/${path}?start=${start}&limit=25&at=${branch}`)

    isOASExtension.returns(false)
    await svc.client.source.read({
      branch,
      repo_slug,
      workspace,
      baseUrl,
      start
    })
    expect(requestPromise.callCount).to.equal(2)
    expect(requestPromise.lastCall.args[0].url).equal(`${baseUrl}/projects/${workspace}/repos/${repo_slug}/files/?start=${start}&limit=25&at=${branch}`)
  });

  it('BitBucketV1: construct class exit if proxy is wrong', () => {
    consoleStub = sandbox.stub(console, 'log');
    processStub = sandbox.stub(process, 'exit');
    proxyConfig = {
      httpProxy: 'notAURL',
      strictSSL: false
    }

		new Service({
      ...okConfig,
      apiVersion: 'v1',
      baseUrl: 'http://127.0.0.1:7990/rest/api/1.0'
    });
    expect(processStub.callCount).to.equal(1)
  });

  it('generateResources: calls writeSpecification if path is OAS', async () => {
    writeSpecification = sandbox.stub(Service.prototype, 'writeSpecification');
    writeSpecification.resolves()
    const svc = new Service({
      ...okConfig,
      path: 'petstore.json'
    });
    await svc.generateResources()
    expect(writeSpecification.callCount).to.equal(1);
  })

  it('generateResources: calls getPage', async () => {
    getPage = sandbox.stub(Service.prototype, 'getPage');
    getPage.resolves()
    const svc = new Service({
      ...okConfig
    });
    await svc.generateResources()
    expect(getPage.callCount).to.equal(1);
  })

  it('generateResources: v2 calls writeSpecification', async () => {
    getPage = sandbox.stub(Service.prototype, 'getPage');
    writeSpecification = sandbox.stub(Service.prototype, 'writeSpecification');
    writeSpecification.resolves();
    getPage.resolves({
      values: [
        { type: 'commit_file', path: 'petstore.json' }
      ]
    })
    const svc = new Service({
      ...okConfig
    });
    await svc.generateResources()
    expect(getPage.callCount).to.equal(1);
    expect(writeSpecification.callCount).to.equal(1);
    expect(writeSpecification.firstCall.args[0]).to.equal('petstore.json');
  })

  it('generateResources: v1 calls writeSpecification', async () => {
    getPage = sandbox.stub(Service.prototype, 'getPage');
    writeSpecification = sandbox.stub(Service.prototype, 'writeSpecification');
    writeSpecification.resolves();
    getPage.resolves({
      values: [
        'petstore.json'
      ]
    })
    const svc = new Service({
      ...okConfig,
      apiVersion: 'v1',
      baseUrl: 'http://127.0.0.1:7990/rest/api/1.0',
      path: 'somenesteddir'
    });
    await svc.generateResources()
    expect(getPage.callCount).to.equal(1);
    expect(writeSpecification.callCount).to.equal(1);
    expect(writeSpecification.firstCall.args[0]).to.equal('somenesteddir/petstore.json');
  })

  it('getPage: Calls v1 client', async () => {
    const svc = new Service({
      ...okConfig,
      apiVersion: 'v1',
      baseUrl: 'http://127.0.0.1:7990/rest/api/1.0'
    });

    clientRead = sandbox.stub().resolves({})
    sandbox.stub(svc.client, 'source').get(() => ({
      read: clientRead
    }))
    
    await svc.generateResources()
    expect(clientRead.callCount).to.equal(1);
    expect(clientRead.firstCall.args[0].start).to.equal(0)
  });

  it('getPage: Calls v2 client', async () => {
    const svc = new Service({
      ...okConfig
    });

    clientRead = sandbox.stub(svc.client.source, 'read').resolves({})
    
    await svc.generateResources()
    expect(clientRead.callCount).to.equal(1);
    expect(clientRead.firstCall.args[0].max_depth).to.equal(20)
  })

  it('getPage: throw if there is a problem fetching a page', async () => {
    const svc = new Service({
      ...okConfig
    });

    clientRead = sandbox.stub(svc.client.source, 'read').rejects(new Error('some error'))
    try {
      await svc.generateResources()
    } catch (error) {
      expect(error.message).to.equal('some error')
    }
  });

  it('writeSpecification: call a client, peek, and writeAPI4Central', async () => {
    let Stubbed = proxyquire('./service', {
      '@axway/amplify-cli-utils': {
        loadConfig: () => ({
          get: () => (proxyConfig)
        })
      },
      './utils': {
        isOASExtension: () => true
      },
      '@apidevtools/swagger-parser': {
        validate: () => ({})
      }
    });

    peek = sandbox.stub(Stubbed.prototype, 'peek').returns(true);
    writeAPI4Central = sandbox.stub(Stubbed.prototype, 'writeAPI4Central').resolves()

    // v1
    let svc = new Stubbed({
      ...okConfig,
      path: 'petstore.json',
      apiVersion: 'v1', 
      baseUrl: 'http://127.0.0.1:7990/rest/api/1.0'
    });

    clientRead = sandbox.stub().resolves({ data: {} })
    sandbox.stub(svc.client, 'source').get(() => ({
      read: clientRead
    }))
    await svc.generateResources()
    expect(clientRead.callCount).to.equal(1)
    expect(peek.callCount).to.equal(1)
    expect(writeAPI4Central.callCount).to.equal(1)

    // v2
    svc = new Stubbed({
      ...okConfig,
      path: 'petstore.json'
    });
    clientRead = sandbox.stub(svc.client.source, 'read').resolves({ data: {} })
    await svc.generateResources()
    expect(peek.callCount).to.equal(2)
    expect(writeAPI4Central.callCount).to.equal(2)
  });

  it('peek: true if yml is likely spec', async () => {
    const svc = new Service({
      ...okConfig
    });
    const isOAS = svc['peek']('petstore.yml', "swagger: '2.0'")
    expect(typeof isOAS).to.equal('object')
  })

  it('peek: true if json is likely spec', async () => {
    const svc = new Service({
      ...okConfig
    });
    const isOAS = svc['peek']('petstore.json', JSON.stringify({ swagger: '2.0' }))
    expect(typeof isOAS).to.equal('object')
  })

  it('peek: false if name is not yaml/yml/json', async () => {
    const svc = new Service({
      ...okConfig
    });
    const isOAS = svc['peek']('petstore', '')
    expect(isOAS).to.equal(false)
  })

  it('peek: false if object does have swagger/openapi prop', async () => {
    const svc = new Service({
      ...okConfig
    });
    const isOAS = svc['peek']('petstore.json', '{}')
    expect(isOAS).to.equal(false)
  })

  it('writeAPI4Central', async () => {
    commitToFs = sandbox.stub()
    let Stubbed = proxyquire('./service', {
      './utils': {
        isOASExtension: () => true,
        commitToFs,
        getIconData: () => ''
      }
    });
    const svc = new Stubbed({
      ...okConfig
    });
		
		await svc.writeAPI4Central('repo', testSwagger);
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);
		expect(commitToFs.lastCall.args[2].length).to.equal(4);
	});

	it('writeAPI4Central: oas3', async () => {
    commitToFs = sandbox.stub()
    let Stubbed = proxyquire('./service', {
      './utils': {
        isOASExtension: () => true,
        commitToFs,
        getIconData: () => ''
      }
    });
    const svc = new Stubbed({
      ...okConfig
    });
	
		await svc.writeAPI4Central('repo', testOas3);
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);	
		expect(commitToFs.lastCall.args[2].length).to.equal(4);
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[0].host).to.equal("apicentral.axway.com");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[0].protocol).to.equal("https");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[0].routing.basePath).to.equal("/apis");
	});

	it('writeAPI4Central: oas3 with multiple servers', async () => {
		commitToFs = sandbox.stub()
    let Stubbed = proxyquire('./service', {
      './utils': {
        isOASExtension: () => true,
        commitToFs,
        getIconData: () => ''
      }
    });
    const svc = new Stubbed({
      ...okConfig
    });
		await svc.writeAPI4Central('repo', testOas3MultipleServers);
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);	
		expect(commitToFs.lastCall.args[2].length).to.equal(4);
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[0].host).to.equal("apicentral.axway.com");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[0].protocol).to.equal("https");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[0].routing.basePath).to.equal("/apis");

		expect(commitToFs.lastCall.args[2][2].spec.endpoint[1].host).to.equal("apicentraltest.axway.com");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[1].protocol).to.equal("http");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[1].port).to.equal(8080);
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[1].routing.basePath).to.equal("/no-apis");

		expect(commitToFs.lastCall.args[2][2].spec.endpoint[2].host).to.equal("nopath.axway.com");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[2].protocol).to.equal("http");
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[2].port).to.not.exist;
		expect(commitToFs.lastCall.args[2][2].spec.endpoint[2].routing.basePath).to.eq("/");
	});

	it('writeAPI4Central: oas3 with no servers', async () => {
    commitToFs = sandbox.stub()
    let Stubbed = proxyquire('./service', {
      './utils': {
        isOASExtension: () => true,
        commitToFs,
        getIconData: () => ''
      }
    });
    const svc = new Stubbed({
      ...okConfig
    });
		await svc.writeAPI4Central('repo', testOas3NoServers);
		expect(commitToFs.callCount).to.equal(1);
		expect(commitToFs.lastCall.args[0].kind).to.equal('ConsumerInstance');
		expect(commitToFs.lastCall.args[1]).to.equal(undefined);	
		expect(commitToFs.lastCall.args[2].length).to.equal(4);
		expect(commitToFs.lastCall.args[2][2].spec.endpoint.length).to.equal(0);
	});
});
