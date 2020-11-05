const proxyquire =  require('proxyquire').noCallThru();
import { expect } from "chai";
import Sinon from "sinon";
import { Bitbucket } from "bitbucket";
import { ConfigKeys } from "../types";

describe("Bitbucket service", () => {
  const sandbox = Sinon.createSandbox();
  let requestPromise: SinonStub = sandbox.stub();
  let commitToFs: SinonStub = sandbox.stub();
  let processStub: SinonStub;
  let consoleStub: SinonStub;
  let writeSpecification: SinonStub;
  let getPage: SinonStub;

  let proxyConfig:any = {
		values: {}
  };
  
  let Service = proxyquire('./service', {
    '@axway/amplify-cli-utils': {
			loadConfig: () => (proxyConfig)
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
		proxyConfig.values = {
			network: {
        httpProxy: "http://127.0.0.1", 
        strictSSL: false
			}
		}
		new Service(okConfig);
	
		expect(consoleStub.firstCall.args[0].startsWith('Connecting using proxy settings')).to.be.true;
  });
  
  it('init: construct class ok & sets https proxy properties', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		proxyConfig.values = {
			network: {
				httpsProxy: "https://test:as@127.0.0.1",
			}
		}
		new Service(okConfig);
	
		expect(consoleStub.firstCall.args[0].startsWith('Connecting using proxy settings')).to.be.true;
  });
  
  it('init: construct class ok & sets rejectUnauthorized', () => {
		processStub = sandbox.stub(process, 'exit');
		consoleStub = sandbox.stub(console, 'log');
		proxyConfig.values = {
			network: {
				strictSSL: true
			}
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
});
