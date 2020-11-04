import { expect } from "chai";
import Sinon from "sinon";
import { Config } from "../types";
import { BitbucketService } from "./service";

describe.skip("Bitbucket service", () => {
  const sandbox = Sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("should throw an error if required configurations are not provided", async () => {
    //@ts-ignore
    expect(() => new BitbucketService({})).to.throw();
  });

  it("should not throw if all required configurations are provided", async () => {
    const config: Config = {
      branch: "master",
      environmentName: "test",
      repo: "test",
      username: "test",
      appPassword: "test",
      workspace: "test",
      icon: "test",
      outputDir: "test",
      path: "/",
      baseUrl: "127.0.0.1:7990/rest/api/1.0",
      apiVersion: "v1",
      accessToken: '123'
    };
    expect(() => new BitbucketService(config)).to.not.throw();
  });
});
