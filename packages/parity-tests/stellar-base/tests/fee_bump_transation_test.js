import randomBytes from 'randombytes';
import { encodeMuxedAccountToAddress } from '../../src/util/decode_encode_muxed_account';

describe('FeeBumpTransaction', function () {
  let baseFee, networkPassphrase, innerSource, innerAccount, destination, amount, asset, innerTx, feeSource, transaction;
  beforeEach(function () {
    baseFee = '100';
    networkPassphrase = 'Standalone Network ; February 2017';
    innerSource = StellarBase.Keypair.master(networkPassphrase);
    innerAccount = new StellarBase.Account(
      innerSource.publicKey(),
      '7'
    );
    destination =
      'GDQERENWDDSQZS7R7WKHZI3BSOYMV3FSWR7TFUYFTKQ447PIX6NREOJM';
    amount = '2000.0000000';
    asset = StellarBase.Asset.native();

    innerTx = new StellarBase.TransactionBuilder(innerAccount, {
      fee: '100',
      networkPassphrase: networkPassphrase,
      timebounds: {
        minTime: 0,
        maxTime: 0
      }
    })
      .addOperation(
        StellarBase.Operation.payment({
          destination: destination,
          asset: asset,
          amount: amount
        })
      )
      .addMemo(StellarBase.Memo.text('Happy birthday!'))
      .build();
    innerTx.sign(innerSource);
    feeSource = StellarBase.Keypair.fromSecret(
      'SB7ZMPZB3YMMK5CUWENXVLZWBK4KYX4YU5JBXQNZSK2DP2Q7V3LVTO5V'
    );
    transaction = StellarBase.TransactionBuilder.buildFeeBumpTransaction(
      feeSource,
      '100',
      innerTx,
      networkPassphrase
    );
  });

  it('constructs a FeeBumpTransaction object from a TransactionEnvelope', function () {
    transaction.sign(feeSource);

    expect(transaction.feeSource).to.be.equal(feeSource.publicKey());
    expect(transaction.fee).to.be.equal('200');

    const innerTransaction = transaction.innerTransaction;

    expect(innerTransaction.toXDR()).to.be.equal(innerTx.toXDR());
    expect(innerTransaction.source).to.be.equal(innerSource.publicKey());
    expect(innerTransaction.fee).to.be.equal('100');
    expect(innerTransaction.memo.type).to.be.equal(StellarBase.MemoText);
    expect(innerTransaction.memo.value.toString('ascii')).to.be.equal(
      'Happy birthday!'
    );
    const operation = innerTransaction.operations[0];
    expect(operation.type).to.be.equal('payment');
    expect(operation.destination).to.be.equal(destination);
    expect(operation.amount).to.be.equal(amount);

    const expectedXDR =
      'AAAABQAAAADgSJG2GOUMy/H9lHyjYZOwyuyytH8y0wWaoc596L+bEgAAAAAAAADIAAAAAgAAAABzdv3ojkzWHMD7KUoXhrPx0GH18vHKV0ZfqpMiEblG1gAAAGQAAAAAAAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAA9IYXBweSBiaXJ0aGRheSEAAAAAAQAAAAAAAAABAAAAAOBIkbYY5QzL8f2UfKNhk7DK7LK0fzLTBZqhzn3ov5sSAAAAAAAAAASoF8gAAAAAAAAAAAERuUbWAAAAQK933Dnt1pxXlsf1B5CYn81PLxeYsx+MiV9EGbMdUfEcdDWUySyIkdzJefjpR5ejdXVp/KXosGmNUQ+DrIBlzg0AAAAAAAAAAei/mxIAAABAijIIQpL6KlFefiL4FP8UWQktWEz4wFgGNSaXe7mZdVMuiREntehi1b7MRqZ1h+W+Y0y+Z2HtMunsilT2yS5mAA==';

    expect(transaction.toEnvelope().toXDR().toString('base64')).to.be.equal(
      expectedXDR
    );
    const expectedTxEnvelope = StellarBase.xdr.TransactionEnvelope.fromXDR(
      expectedXDR,
      'base64'
    ).value();

    expect(innerTransaction.source).to.equal(
      StellarBase.StrKey.encodeEd25519PublicKey(
        expectedTxEnvelope.tx().innerTx().value().tx().sourceAccount().ed25519()
      )
    );
    expect(transaction.feeSource).to.equal(
      StellarBase.StrKey.encodeEd25519PublicKey(
        expectedTxEnvelope.tx().feeSource().ed25519()
      )
    );

    expect(transaction.innerTransaction.fee).to.equal(
      expectedTxEnvelope.tx().innerTx().value().tx().fee().toString()
    );
    expect(transaction.fee).to.equal(expectedTxEnvelope.tx().fee().toString());

    expect(innerTransaction.signatures.length).to.equal(1);
    expect(innerTransaction.signatures[0].toXDR().toString('base64')).to.equal(
      expectedTxEnvelope
        .tx()
        .innerTx()
        .value()
        .signatures()[0]
        .toXDR()
        .toString('base64')
    );

    expect(transaction.signatures.length).to.equal(1);
    expect(transaction.signatures[0].toXDR().toString('base64')).to.equal(
      expectedTxEnvelope.signatures()[0].toXDR().toString('base64')
    );
  });

  it('throws when a garbage Network is selected', function () {
    const input = transaction.toEnvelope();

    expect(() => {
      new StellarBase.FeeBumpTransaction(input, { garbage: 'yes' });
    }).to.throw(/expected a string/);

    expect(() => {
      new StellarBase.FeeBumpTransaction(input, 1234);
    }).to.throw(/expected a string/);
  });

  it('signs correctly', function () {
    const tx = transaction;
    tx.sign(feeSource);
    const rawSig = tx.toEnvelope().feeBump().signatures()[0].signature();
    expect(feeSource.verify(tx.hash(), rawSig)).to.equal(true);
  });

  it('signs using hash preimage', function () {
    let preimage = randomBytes(64);
    let hash = StellarBase.hash(preimage);
    let tx = transaction;
    tx.signHashX(preimage);
    let env = tx.toEnvelope().feeBump();
    expectBuffersToBeEqual(env.signatures()[0].signature(), preimage);
    expectBuffersToBeEqual(
      env.signatures()[0].hint(),
      hash.slice(hash.length - 4)
    );
  });

  it('returns error when signing using hash preimage that is too long', function () {
    let preimage = randomBytes(2 * 64);
    let tx = transaction;
    expect(() => tx.signHashX(preimage)).to.throw(
      /preimage cannnot be longer than 64 bytes/
    );
  });

  describe('toEnvelope', function () {
    it('does not return a reference to source signatures', function () {
  
      const envelope = transaction.toEnvelope().value();
      envelope.signatures().push({});

      expect(transaction.signatures.length).to.equal(0);
    });
    it('does not return a reference to the source transaction', function () {
  
      const envelope = transaction.toEnvelope().value();
      envelope.tx().fee(StellarBase.xdr.Int64.fromString('300'));

      expect(transaction.tx.fee().toString()).to.equal('200');
    });
  });

  it('adds signature correctly', function () {

    const signer = feeSource;
    const presignHash = transaction.hash();

    const addedSignatureTx = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      networkPassphrase
    );

    const signature = signer.sign(presignHash).toString('base64');

    addedSignatureTx.addSignature(signer.publicKey(), signature);

    const envelopeAddedSignature = addedSignatureTx.toEnvelope().feeBump();

    expect(
      signer.verify(
        addedSignatureTx.hash(),
        envelopeAddedSignature.signatures()[0].signature()
      )
    ).to.equal(true);

    transaction.sign(signer);
    const envelopeSigned = transaction.toEnvelope().feeBump();

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].signature(),
      envelopeAddedSignature.signatures()[0].signature()
    );

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].hint(),
      envelopeAddedSignature.signatures()[0].hint()
    );

    expectBuffersToBeEqual(addedSignatureTx.hash(), transaction.hash());
  });

  it('adds signature generated by getKeypairSignature', function () {

    const presignHash = transaction.hash();
    const signer = feeSource;

    const signature = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      networkPassphrase
    ).getKeypairSignature(signer);

    expect(signer.sign(presignHash).toString('base64')).to.equal(signature);

    const addedSignatureTx = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      networkPassphrase
    );

    expect(addedSignatureTx.signatures.length).to.equal(0);
    addedSignatureTx.addSignature(signer.publicKey(), signature);

    const envelopeAddedSignature = addedSignatureTx.toEnvelope().feeBump();

    expect(
      signer.verify(
        transaction.hash(),
        envelopeAddedSignature.signatures()[0].signature()
      )
    ).to.equal(true);

    expect(transaction.signatures.length).to.equal(0);
    transaction.sign(signer);
    const envelopeSigned = transaction.toEnvelope().feeBump();

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].signature(),
      envelopeAddedSignature.signatures()[0].signature()
    );

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].hint(),
      envelopeAddedSignature.signatures()[0].hint()
    );

    expectBuffersToBeEqual(addedSignatureTx.hash(), transaction.hash());
  });

  it('does not add invalid signature', function () {

    const signer = feeSource;

    const signature = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      networkPassphrase
    ).getKeypairSignature(signer);

    const alteredTx = StellarBase.TransactionBuilder.buildFeeBumpTransaction(
      feeSource,
      '200',
      innerTx,
      networkPassphrase
    );

    expect(() => {
      alteredTx.addSignature(signer.publicKey(), signature);
    }).to.throw('Invalid signature');
  });

  it('outputs xdr as a string', function () {
    const xdrString =
      'AAAABQAAAADgSJG2GOUMy/H9lHyjYZOwyuyytH8y0wWaoc596L+bEgAAAAAAAADIAAAAAgAAAABzdv3ojkzWHMD7KUoXhrPx0GH18vHKV0ZfqpMiEblG1gAAAGQAAAAAAAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAA9IYXBweSBiaXJ0aGRheSEAAAAAAQAAAAAAAAABAAAAAOBIkbYY5QzL8f2UfKNhk7DK7LK0fzLTBZqhzn3ov5sSAAAAAAAAAASoF8gAAAAAAAAAAAERuUbWAAAAQK933Dnt1pxXlsf1B5CYn81PLxeYsx+MiV9EGbMdUfEcdDWUySyIkdzJefjpR5ejdXVp/KXosGmNUQ+DrIBlzg0AAAAAAAAAAei/mxIAAABAijIIQpL6KlFefiL4FP8UWQktWEz4wFgGNSaXe7mZdVMuiREntehi1b7MRqZ1h+W+Y0y+Z2HtMunsilT2yS5mAA==';
    const transaction = new StellarBase.FeeBumpTransaction(
      xdrString,
      networkPassphrase
    );
    expect(transaction).to.be.instanceof(StellarBase.FeeBumpTransaction);
    expect(transaction.toXDR()).to.be.equal(xdrString);
  });

  it('decodes muxed addresses correctly', function () {
    const muxedFeeSource = feeSource.xdrMuxedAccount('0');
    const muxedAddress = encodeMuxedAccountToAddress(muxedFeeSource);

    const envelope = transaction.toEnvelope();
    envelope.feeBump().tx().feeSource(muxedFeeSource);

    const txWithMuxedAccount = new StellarBase.FeeBumpTransaction(
      envelope,
      networkPassphrase
    );
    expect(txWithMuxedAccount.feeSource).to.equal(muxedAddress);
  });
});

function expectBuffersToBeEqual(left, right) {
  let leftHex = left.toString('hex');
  let rightHex = right.toString('hex');
  expect(leftHex).to.eql(rightHex);
}
