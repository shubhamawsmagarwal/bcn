/***** Requiring packages  **********/
const sha256=require('sha256');
const uuid=require('uuid/v1');

/****** Common variables  *******/
const currentNodeUrl=process.argv[3];

/********** Constructor function **********/
function Blockchain(){
    this.chain=[];
    this.pendingTransaction=[];
    this.currentNodeUrl=currentNodeUrl;
    this.networkNodes=[];
    this.createNewBlock(100,'0','0');
}

/******** Blockchain prototype   **********/
Blockchain.prototype.createNewTransaction=function(amount,sender,recipient){
    const newTransaction={
      amount:amount,
      sender:sender,
      recipient:recipient,
      transactionId:uuid().split('-').join('')
    };
    return newTransaction;
}
Blockchain.prototype.addTransactionToPendingTransactions=function(transactionObject){
        this.pendingTransaction.push(transactionObject);
        return this.getLastBlock['index']+1;
}
Blockchain.prototype.getTransaction=function(transactionId){
    let correctTransaction=null;
    let correctBlock=null;
    this.chain.forEach(block=>{
        block.transaction.forEach(transaction=>{
           correctTransaction=transaction;
           correctBlock=block;
        });
    });
    return {
      transaction:correctTransaction,
      block:correctBlock
    };
}
Blockchain.prototype.createNewBlock=function(nonce,previousBlockHash,hash){
    const newBlock={
      index:this.chain.length+1,
      timestamp:Date.now(),
      transaction:this.pendingTransaction,
      nonce:nonce,
      hash:hash,
      previousBlockHash:previousBlockHash
    };
    this.pendingTransaction=[];
    this.chain.push(newBlock);
    return newBlock;
}
Blockchain.prototype.getLastBlock=function(){
    return this.chain[this.chain.length-1];
}
Blockchain.prototype.getBlock=function(blockHash){
  let correctBlock=null;
  this.chain.forEach(block=>{
      if(block.hash===blockHash)
        correctBlock=block;
  });
  return correctBlock;
}
Blockchain.prototype.hashBlock=function(previousBlockHash,currentBlockData,nonce){
    const dataAsString=previousBlockHash+nonce.toString()+JSON.stringify(currentBlockData);
    const hash=sha256(dataAsString);
    return hash;
}
Blockchain.prototype.proofOfWork=function(previousBlockHash,currentBlockData){
    let nonce=0;
    let hash=this.hashBlock(previousBlockHash,currentBlockData,nonce);
    while(hash.substring(0,4)!=='0000'){
        nonce++;
        hash=this.hashBlock(previousBlockHash,currentBlockData,nonce);
    }
    return nonce;
}
Blockchain.prototype.chainIsValid=function(blockchain){
    let validChain=true;
    for(var i=1;i<blockchain.length;i++){
        const currentBlock=blockchain[i];
        const prevBlock=blockchain[i-1];
        const blockHash=this.hashBlock(prevBlock['hash'],{transaction:currentBlock['transaction'],index:currentBlock['index']},currentBlock['nonce']);
        if(blockHash.substring(0,4)!=='0000')
           validChain=false;
        if(currentBlock['previousBlockHash']!==prevBlock['hash'])
           validChain=false;
    }
    const genesisBlock=blockchain[0];
    const correctNonce=genesisBlock['nonce']===100;
    const correctPreviousBlockHash=genesisBlock['previousBlockHash']==='0';
    const correctHash=genesisBlock['hash']==='0';
    const correctTransactions=genesisBlock['transaction'].length===0;
    if(!correctNonce && !correctPreviousBlockHash && !correctHash  && !correctTransactions)
       validChain=false;
    return validChain;
}
Blockchain.prototype.getAddressData=function(address){
    const addressTransaction=[];
    this.chain.forEach(block=>{
       block.transaction.forEach(transaction=>{
          if(transaction.sender===address  || transaction.recipient===address)
          addressTransaction.push(transaction);
       });
    });
    let balance=0;
    addressTransaction.forEach(transaction=>{
        if(transaction.recipient===address)
          balance+=transaction.amount;
        else if(transaction.sender===address)
          balance-=transaction.amount;
    });
    return {
      addressTransaction:addressTransaction,
      addressBalance:balance
    };
}
module.exports=Blockchain;