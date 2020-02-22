/****  Requiring packages   **********/
const express=require('express');
const app=express();
const bodyParser=require('body-parser');
const uuid=require('uuid/v1');
const request=require('request');
const rp=require('request-promise');

/***** Importing Blockchain data structure  *********/
const Blockchain=require('./blockchain');
const bitcoin=new Blockchain();


/******* Common variables  *******/
const nodeAddress=uuid().split('-').join("");
const port=process.argv[2];

/*********  app.use  *****/ 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


/********* Get routes *************/
app.get("/blockchain",function(req,res){
    res.send(bitcoin);
});
app.get("/transaction",function(req,res){
    res.render(__dirname + '/views/transaction.ejs');
});
app.get("/transaction/:transactionId",function(req,res){
   const transactionId=req.params.transactionId;
   const transactionData=bitcoin.getTransaction(transactionId);
   res.json({
       transaction:transactionData.transaction,
       block:transactionData.block
   });
});
app.get("/mine",function(req,res){
    const lastBlock=bitcoin.getLastBlock();
    const previousBlockHash=lastBlock['hash'];
    const currentBlockData={
      transaction:bitcoin.pendingTransaction,
      index:lastBlock['index']+1
    };
    const nonce=bitcoin.proofOfWork(previousBlockHash,currentBlockData);
    const blockHash=bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce);
    const newBlock=bitcoin.createNewBlock(nonce,previousBlockHash,blockHash);
    const Promises=[];
      bitcoin.networkNodes.forEach(networkNodeUrl=>{
          const requestOptions={
            uri:networkNodeUrl+'/recieve-new-block',
            method:'POST',
            body:{newBlock:newBlock},
            json:true
          };
          Promises.push(rp(requestOptions));
      });
      Promise.all(Promises).then(data=>{
          const Options={
            uri:bitcoin.currentNodeUrl+'/transaction/broadcast',
            method:'POST',
            body:{amout:12.5,sender:"100",recipient:nodeAddress},
            json:true
          };
          return rp(Options);
      }).then(data=>{
         res.redirect('/blockchain');
      }).catch((error) => {
      res.end(error.message);
    });
});
app.get("/block/:blockHash",function(req,res){
   const blockHash=req.params.blockHash;
   const currentBlock=bitcoin.getLastBlock(blockHash);
   res.json({block:currentBlock});
});
app.get("/register-and-broadcast-node",function(req,res){
   res.render(__dirname + '/views/registerAndBroadcastNode.ejs'); 
});
app.get("/consensus",function(req,res){
    const Promises=[];
      bitcoin.networkNodes.forEach(networkNodeUrl=>{
          const requestOptions={
            uri:networkNodeUrl+'/blockchain',
            method:'GET',
            json:true
          };
          Promises.push(rp(requestOptions));
      });
      Promise.all(Promises).then(blockchains=>{
          const currentChainLength=bitcoin.chain.length;
          let maxChainLength=currentChainLength;
          let newLongestChain=null;
          let newPendingTransactions=null;
          blockchains.forEach(blockchain=>{
             if(blockchain.chain.length>maxChainLength){
                 maxChainLength=blockchain.chain.length;
                 newLongestChain=blockchain.chain;
                 newPendingTransactions=blockchain.pendingTransaction;
             } 
          });
          if(!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
              res.json({note:'chain not replaced'});
          }
          else if(newLongestChain && bitcoin.chainIsValid(newLongestChain)){
              bitcoin.chain=newLongestChain;
              bitcoin.pendingTransaction=newPendingTransactions;
              res.redirect('/blockchain');
          }
      }).catch((error) => {
      res.end(error.message);
    });
});
app.get("address/:address",function(req,res){
   const address=req.params.address;
   const addressData=bitcoin.getAddressData(address);
   res.json({
      addressData:addressData 
   });
});


/********** Post routes  *********/
app.post("/transaction/broadcast",function(req,res){
    const newTransaction=bitcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recipient);
    bitcoin.addTransactionToPendingTransactions(newTransaction);
    const Promises=[];
      bitcoin.networkNodes.forEach(networkNodeUrl=>{
          const requestOptions={
            uri:networkNodeUrl+'/transaction',
            method:'POST',
            body:{newTransaction:newTransaction},
            json:true
          };
          Promises.push(rp(requestOptions));
      });
      Promise.all(Promises).then(data=>{
          res.redirect("/blockchain");
      }).catch((error) => {
      res.end(error.message);
    });
});
app.post("/transaction",function(req,res){
    const newTransaction=req.body.newTransaction;
    const blockIndex=bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.json();
});
app.post("/recieve-new-block",function(req,res){
   const newBlock=req.body.newBlock;
   const lastBlock=bitcoin.getLastBlock();
   const correctHash=lastBlock.hash===newBlock.previousBlockHash;
   const correctIndex=lastBlock['index']+1===newBlock['index'];
   if(correctHash && correctIndex){
       bitcoin.chain.push(newBlock);
       bitcoin.pendingTransaction=[];
       res.json();
   }
   else{
       res.json();
   }
});
app.post("/register-and-broadcast-node",function(req,res){
    const newNodeUrl=req.body.newNodeUrl;
    if(bitcoin.networkNodes.indexOf(newNodeUrl)===-1)
      bitcoin.networkNodes.push(newNodeUrl);
      const Promises=[];
      bitcoin.networkNodes.forEach(networkNodeUrl=>{
          const requestOptions={
            uri:networkNodeUrl+'/register-node',
            method:'POST',
            body:{newNodeUrl:newNodeUrl},
            json:true
          };
          Promises.push(rp(requestOptions));
      });
      Promise.all(Promises).then(data=>{
          const Options={
            uri:newNodeUrl+'/register-nodes-bulk',
            method:'POST',
            body:{allNetworkNodes:[... bitcoin.networkNodes,bitcoin.currentNodeUrl]},
            json:true
          };
          return rp(Options);
      }).then(data=>{
         res.redirect('/blockchain');
      }).catch((error) => {
      res.end(error.message);
    });
});
app.post("/register-node",function(req,res){
   const newNodeUrl=req.body.newNodeUrl;
   if((bitcoin.networkNodes.indexOf(newNodeUrl)===-1) &&  (bitcoin.currentNodeUrl!==newNodeUrl))
      bitcoin.networkNodes.push(newNodeUrl);
   res.json();
});
app.post("/register-nodes-bulk",function(req,res){
   const allNetworkNodes=req.body.allNetworkNodes;
   allNetworkNodes.forEach(networkNodeUrl=>{
        if((bitcoin.networkNodes.indexOf(networkNodeUrl)===-1) &&  (bitcoin.currentNodeUrl!==networkNodeUrl))
           bitcoin.networkNodes.push(networkNodeUrl);
   });
   res.json();
});
app.listen(port,'127.0.0.1',function(){
   console.log("Server running...");
});