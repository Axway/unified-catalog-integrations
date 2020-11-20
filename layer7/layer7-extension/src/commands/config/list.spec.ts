import { expect } from "chai";
import fs from "fs-extra";
import sinon, { SinonSandbox, SinonSpy, SinonStub } from "sinon";
import * as utils from "../../utils";
import { list } from "./list";

describe("config: list", () => {
  let mockConsole: {
    error: SinonSpy;
    log: SinonSpy;
  };
  let readJsonSync: SinonStub;
  let configFilePath: SinonStub;
  let sandbox: SinonSandbox = sinon.createSandbox();

  beforeEach(() => {
    mockConsole = {
      error: sandbox.spy(),
      log: sandbox.spy(),
    };
    configFilePath = sandbox.stub(utils, "configFilePath");
    readJsonSync = sandbox.stub(fs, "readJsonSync");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("success", async () => {
    let testConfig = { someConfig: "foo" };
    configFilePath.value("foobar");
    readJsonSync.returns({ someConfig: "foo" });

    list.action({ console: mockConsole as any });
    expect(readJsonSync.calledOnceWith("foobar")).to.be.true;
    expect(mockConsole.log.calledOnceWith(testConfig)).to.be.true;
  });
});
