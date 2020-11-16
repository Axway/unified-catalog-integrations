import { SinonStatic, SinonStub as _SinonStub, SinonSpy as _SinonSpy, SinonMock as _SinonMock, SinonSandbox as _SinonSandbox } from 'sinon';
import "source-map-support/register";

process.env.NODE_ENV = "test";

declare global {
	const expect: Chai.ExpectStatic;
	const sinon: SinonStatic;
	type SinonStub = _SinonStub;
	type SinonSpy = _SinonSpy;
	type SinonMock = _SinonMock;
	type SinonSandbox = _SinonSandbox;

	namespace NodeJS {
		interface Global {
			// adding this for assigning in testSetup.ts
			expect: Chai.ExpectStatic;
			sinon: SinonStatic;
		}
	}
}

export {};
