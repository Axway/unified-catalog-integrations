import { expect } from "chai";
import "chai/register-should";
//import nock from "nock";
import sinon from "sinon";
import "source-map-support/register";

process.env.NODE_ENV = "test";

//@ts-ignore
global.expect = expect;
global.sinon = sinon;

//nock.disableNetConnect();
