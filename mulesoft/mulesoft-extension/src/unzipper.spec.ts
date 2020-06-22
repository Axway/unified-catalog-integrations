// @ts-ignore
const proxyquire =  require('proxyquire').noCallThru();
const nock = require('nock');


describe('unzipper', () => {
	let sandbox: SinonSandbox = sinon.createSandbox();
	let getData: SinonStub = sandbox.stub();
	let getEntries: SinonStub = sandbox.stub();
	getEntries.returns([{
		getData,
		entryName: 'foo.zip'
	}])
	class AdmZip {
		getEntries () {
			return getEntries()
		}
		
	}

	const unzipper = proxyquire('./unzipper', {
		'adm-zip': AdmZip
	})
	
	afterEach(() => {
		sandbox.restore();
		getData.reset();
	});

	it('does download/unzip with filename', async () => {
		getData.returns({});
		nock('http://example.com')
			.get('/')
			.reply(200, [1, 2, 3])

		await unzipper.downloadAndUnzip('http://example.com', 'foo.zip')
		expect(getData.callCount).to.equal(1);
	});

	it('does download/unzip without filename', async () => {
		getData.returns({});
		nock('http://example.com')
			.get('/')
			.reply(200, [1, 2, 3])

		await unzipper.downloadAndUnzip('http://example.com')
		expect(getData.callCount).to.equal(1);
	});

	it('reject if no entries', async () => {
		getEntries.returns([]);
		nock('http://example.com')
			.get('/')
			.reply(200, [1, 2, 3])
		try {
			await unzipper.downloadAndUnzip('http://example.com');
		}	catch (e) {
			expect(getData.callCount).to.equal(0);
			expect(e.message.startsWith('No file')).to.equal(true);
		}		
	});
})