let currentAccount;
let lastTransactionTime;
let invested;
let params;
let amountuser;
let statstotalprof;
let walletTronWeb;
let contract;
let siteLoading = true;
let acctConnected = false;
let lastTrans = null;

const defaultSponsor = 'TGiyNohpFQcCauqqaePLtH8JSop3jBeRFn';
const contractAddress = 'TFrBVjdpsuWQUMtjFpMxhUKg2q3oa6rgGv';
const serverUrl = 'https://arcane-spire-90140.herokuapp.com/';
const tronScan = 'https://tronscan.org/#/transaction/';

function startInterval(seconds, callback) {
  callback();
  return setInterval(callback, seconds * 1000);
}

const copy = () => {
  /* Get the text field */
  var copyText = document.getElementById('accountRef');

  /* Select the text field */
  copyText.select();
  copyText.setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand('copy');

  showPopup('Copied', 'success');
};

const thousandsSeparators = (num) => {
  var num_parts = num.toString().split('.');
  num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return num_parts.join('.');
};

const showPopup = (msg, type, secs = 4) => {
  $(`#popup-${type}-msg`).html(msg);

  $('.popup').removeClass('show');

  $(`.${type}-popover`).addClass('show');
  if (secs) {
    window.setTimeout(() => {
      $(`.${type}-popover`).removeClass('show');
    }, secs * 1000);
  }
};

const runCounter = (id, value) => {
  $({ Counter: 0 }).animate(
    {
      Counter: value,
    },
    {
      duration: 1000,
      easing: 'swing',
      step: function (now) {
        $(id).val(now.toFixed(6));
      },
    }
  );
};

const newTransaction = (amount) => {
  $(`#custom-popover-msg`).html(amount + ' TRX Deposited');

  $('.custom-popover').addClass('custom-popover-active');
  window.setTimeout(() => {
    $('.custom-popover').removeClass('custom-popover-active');
  }, 3000);
};

const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = 'https://api.trongrid.io/';

const customTronWeb = new TronWeb(fullNode, solidityNode, eventServer);
customTronWeb.setAddress(contractAddress);

function getDataFromServer() {
  let url = `${serverUrl}api/events/today`;
  if (currentAccount) {
    const currentUser =
      '0x' + customTronWeb.address.toHex(currentAccount).substr(2);
    url = `${serverUrl}api/events/today?userAddress=${currentUser}`;
  }
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.user) {
        let amount = customTronWeb.fromSun(data.user.amount);
        amountuser = amount;
        $('#deposits').text(amount);
      } else {
        $('#deposits').text(0);
      }
      data.topFiveTrans.forEach((trans, i) => {
        let amount = customTronWeb.fromSun(trans.result.amount);
        $(`#today-${i}`).removeClass('d-none');
        $(`#today-${i}-amount`).text(parseFloat(amount).toFixed(2) + ' TRX');
        $(`#today-${i}-address`).val(
          customTronWeb.address.fromHex(trans.result.user)
        );
        $(`#today-${i}-link`).attr(
          'href',
          `${tronScan}${trans.transaction_id}`
        );
      });

      data.lastFiveTrans.forEach((trans, i) => {
        let amount = customTronWeb.fromSun(trans.result.amount);
        if (i == 0) {
          if (lastTrans && lastTrans != trans._id) {
            newTransaction(amount);
            lastTrans = trans._id;
          } else {
            lastTrans = trans._id;
          }
        }
        $(`#last-${i}`).removeClass('d-none');
        $(`#last-${i}-amount`).text(parseFloat(amount).toFixed(2) + ' TRX');
        $(`#last-${i}-address`).val(
          customTronWeb.address.fromHex(trans.result.user)
        );
        $(`#last-${i}-link`).attr('href', `${tronScan}${trans.transaction_id}`);
      });
    });
}

startInterval(30, getDataFromServer);

function getLastDayTopDeposits() {
  fetch(`${serverUrl}api/events/last-day`)
    .then((response) => response.json())
    .then((data) => {
      data.forEach((trans, i) => {
        let amount = customTronWeb.fromSun(trans.result.amount);
        $(`#last-day-${i}`).removeClass('d-none');
        $(`#last-day-${i}-amount`).text(parseFloat(amount).toFixed(2) + ' TRX');
        $(`#last-day-${i}-address`).val(
          customTronWeb.address.fromHex(trans.result.user)
        );
        $(`#last-day-${i}-link`).attr(
          'href',
          `${tronScan}${trans.transaction_id}`
        );
      });
    });
}
getLastDayTopDeposits();

$(document).ready(async () => {
  const url = new URL(window.location);
  params = new URLSearchParams(url.search);

  loadContract();

  if (window.tronWeb && window.tronWeb.ready) {
    walletTronWeb = window.tronWeb;
    loadNewContract();
  }

  const connectWallet = setInterval(() => {
    if (walletTronWeb) {
      clearInterval(connectWallet);
    } else if (window.tronWeb && window.tronWeb.ready) {
      walletTronWeb = window.tronWeb;
      loadNewContract();
    }
  }, 200);

  setTimeout(() => {
    if (!walletTronWeb) {
      clearInterval(connectWallet);
      showPopup(
        'Unable to connect to Wallet. Try Refreshing the site.',
        'error',
        15
      );
    }
  }, 15000);
});

const getTotalInvested = async () => {
  let totalInvested = await contract.totalInvested().call();
  $('#totalInvested').text(
    thousandsSeparators(parseInt(totalInvested.toNumber() / 1000000))
  );
};

const getContractBalanceRate = async () => {
  let contractBalanceRate = await contract.getContractBalanceRate().call();
  $('#roi').text((contractBalanceRate.toNumber() / 10 + 1).toFixed(1));
};

const getTotalInvestors = async () => {
  let totalInvestors = await contract.totalPlayers().call();
  $('#totalInvestors').text(thousandsSeparators(totalInvestors.toNumber()));
};

const getBalanceOfContract = async () => {
  return customTronWeb.trx.getBalance(contractAddress).then((res) => {
    const contbalance = parseInt(res / 1000000);
    if (contbalance) {
      $('#contbalance').text(thousandsSeparators(contbalance));
    } else {
      $('#contbalance').text(0);
    }
    return contbalance;
  });
};

const contractData = () => {
  getTotalInvested();
  getTotalInvestors();
  getContractBalanceRate();
  getBalanceOfContract();
};

const loadContract = async () => {
  contract = await customTronWeb.contract().at(contractAddress);
  startInterval(30, contractData);
};

const loadNewContract = async () => {
  contract = await walletTronWeb.contract().at(contractAddress);
  if (walletTronWeb.defaultAddress.base58) {
    showPopup('Connected to Tron LINK.', 'success');
    acctConnected = true;
    startInterval(5, accountData);
  } else {
    showPopup('Unable to Connect to your Account in Wallet.', 'error');
  }
};

const getDeposit = async () => {
  let invester = await contract.players(currentAccount).call();
  const deposit = invester.trxDeposit.toNumber() / 1000000;
  return deposit.toFixed(6);
};

const getProfit = async () => {
  return await contract.getProfit(currentAccount).call();
};

const getBalanceOfAccount = async () => {
  return walletTronWeb.trx.getBalance(currentAccount).then((res) => {
    const balance = parseInt(res / 1000000);
    if (balance) {
      $('#balance').text(balance);
    } else {
      $('#balance').text(0);
    }
    return balance;
  });
};

const getUserStats = async () => {
  let invester = await contract.players(currentAccount).call();
  $('#address2').text(currentAccount);
  const userpayout = invester.payoutSum.toNumber() / 1000000;
  $('#userpayout').text(userpayout.toFixed(2));
  const sponsoraddress1 = invester.affFrom;
  const sponsoraddress = walletTronWeb.address.fromHex(sponsoraddress1);
  if (sponsoraddress == 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb') {
    $('#sponsoraddress').text('You have no Sponsor');
  } else {
    $('#sponsoraddress').text(sponsoraddress);
  }
  const refrewards = invester.affRewards.toNumber() / 1000000;
  const aff1 = invester.aff1sum.toNumber();
  const aff2 = invester.aff2sum.toNumber();
  const aff3 = invester.aff3sum.toNumber();
  const aff4 = invester.aff4sum.toNumber();
  $('#refrewards').text(refrewards.toFixed(2));
  $('#aff1').text(aff1);
  $('#aff2').text(aff2);
  $('#aff3').text(aff3);
  $('#aff4').text(aff4);
  $('#refrewards2').text(refrewards.toFixed(2));
  $('#aff11').text(aff1);
  $('#aff22').text(aff2);
  $('#aff33').text(aff3);
  $('#aff44').text(aff4);	
  $('#statsactivecap').text(invested);

  $('#statsreinvest').text(
    Math.abs(
      parseFloat(
        parseFloat(
          parseFloat(invested) -
            parseFloat(amountuser) -
            parseFloat($('#refrewards').text()) +
            parseFloat($('#userpayout').text() / 4)
        ) * 2
      )
    ).toFixed(1)
  );

  $('#statsinaccap').text(
    parseFloat(
      parseFloat($('#statsreinvest').text() / 2) +
        parseFloat($('#userpayout').text() / 2)
    ).toFixed(2)
  );
  $('#statstotalcap').text(
    parseFloat(
      parseFloat($('#statsinaccap').text()) + parseFloat(invested)
    ).toFixed(2)
  );
  $('#statsciwith').text(
    parseFloat(
      parseFloat($('#statsreinvest').text()) +
        parseFloat($('#userpayout').text())
    ).toFixed(2)
  );

  $('#statscigenerated').text(
    parseFloat(
      parseFloat($('#statsreinvest').text()) +
        parseFloat($('#userpayout').text()) +
        parseFloat(statstotalprof)
    ).toFixed(2)
  );

  $('#statstotaldouble').text(
    parseFloat(
      parseFloat(parseFloat($('#statsinaccap').text()) + parseFloat(invested)) *
        2
    ).toFixed(2)
  );

  $('#statscipending').text(
    parseFloat(amountuser) -
            parseFloat(($('#userpayout').text() * 3) / 4)
  );
};

const accountData = async () => {
  if (walletTronWeb.defaultAddress.base58) {
    if (
      currentAccount &&
      currentAccount !== walletTronWeb.defaultAddress.base58
    ) {
     // currentAccount = walletTronWeb.defaultAddress.base58;
	currentAccount = $('#refererAddress').val();
      showPopup('Account Changed.', 'success');
    } else {
      //currentAccount = walletTronWeb.defaultAddress.base58;
        currentAccount = $('#refererAddress').val();
    }
    $('#address').text(currentAccount);

    getUserStats();

    invested = await getDeposit();
    let profit, totalProfit, halfProfit;
    if (parseInt(invested) > 0) {
      profit = await getProfit(contract);
      totalProfit = (profit.toNumber() / 1000000).toFixed(6);
      halfProfit = (profit.toNumber() / 2000000).toFixed(6);
      statstotalprof = (profit.toNumber() / 1000000).toFixed(6);
      $('#statstotalprof').text(statstotalprof);
      $('#refererAddress').val('You Already have a Sponsor');
      $('#refererAddress').prop('disabled', true);
      $('#accountRef').val('https://tronflow.net/?ref=' + currentAccount);
    } else {
      if (params.has('ref')) {
        $('#refererAddress').prop('disabled', true);
        $('#refererAddress').val(params.get('ref'));
      } else if ($('#refererAddress').val() == 'You Already have a Sponsor') {
        $('#refererAddress').prop('disabled', false);
        $('#refererAddress').val('');
      }
      $('#accountRef').val(
        'You need to invest at least 50 TRX to activate the referral link.'
      );
      invested = totalProfit = halfProfit = 0;
    }
    if (siteLoading) {
      siteLoading = false;
      runCounter('#actualCapital', invested);
      runCounter('#withdrawableAmount', halfProfit);
      runCounter('#withdrawableInterest', halfProfit);
      runCounter('#totalWithdrawable', totalProfit);
    } else {
      $('#actualCapital').val(invested);
      $('#withdrawableAmount').val(halfProfit);
      $('#withdrawableInterest').val(halfProfit);
      $('#totalWithdrawable').val(totalProfit);
    }
    $('.deduction').text(halfProfit);
    $('#invested').text(totalProfit);
    $('#withdrawed').text(totalProfit);
    $('#withdrawal').text((halfProfit / 2).toFixed(6));
    $('#reinvest-new-balance').text(
      parseFloat(
        parseFloat($('#actualCapital').val()) + parseFloat(halfProfit)
      ).toFixed(6)
    );
    $('#withdrawal-new-balance').text(
      parseFloat(
        parseFloat($('#actualCapital').val()) - parseFloat(halfProfit / 2)
      ).toFixed(6)
    );
    getBalanceOfAccount();
  } else {
    showPopup('Tron LINK is disconnected. Please Refresh!', 'error');
    acctConnected = false;
  }
};

// deposit your fund!
async function deposit() {
  let address = $('#refererAddress').val();
  let amount = $('#depositAmount').val();
  if (walletTronWeb && acctConnected) {
    if (!walletTronWeb.isAddress(address) && parseInt(invested) < 1) {
      showPopup('Please Enter Right Address', 'error');
    } else if (amount < 50) {
      showPopup('Minimum Amount is 50 TRX', 'error');
    } else if (amount > (await getBalanceOfAccount())) {
      showPopup('Insufficient Balance', 'error');
    } else if ((await getBalanceOfAccount()) - amount < 20) {
      showPopup(
        'You need a few(15-20) TRX in your wallet to make an transaction',
        'error'
      );
    } else {
      if (parseInt(invested) > 0) {
        address = defaultSponsor;
      }
      let contract = await walletTronWeb.contract().at(contractAddress);
      contract
        .deposit(address)
        .send({
          callValue: walletTronWeb.toSun(amount),
        })
        .then((output) => {
          console.info('Hash ID:', output, '\n');
          showPopup('Deposit Successful', 'success');
        });
    }
  } else {
    showPopup('TronWeb is not Connected', 'error');
  }
}

// withDraw your fund!
async function withdraw() {
  if (walletTronWeb && acctConnected) {
    let contract = await walletTronWeb.contract().at(contractAddress);
    await contract
      .withdraw()
      .send()
      .then((output) => {
        console.info('HashId:' + ' ' + output);
        showPopup('Withdraw Successful', 'success');
      });
  } else {
    showPopup('TronWeb is not Connected', 'error');
  }
}

// reinvest your fund!
async function reinvest() {
  if (walletTronWeb && acctConnected) {
    let contract = await walletTronWeb.contract().at(contractAddress);
    await contract
      .reinvest()
      .send()
      .then((output) => {
        console.info('HashId:' + ' ' + output);
        showPopup('Reinvest Successful', 'success');
      });
  } else {
    showPopup('TronWeb is not Connected', 'error');
  }
}
