/* eslint-disable no-console */
import { useEffect, useState } from 'react';
import {
  useAccounts,
  useDisconnect,
  useConnectUI,
  useWallet,
  useBalance,
  useIsConnected,
  useFuel
} from '@fuel-wallet/react';
import './App.css';
import { CounterAbi__factory } from "./contracts";
import {
  bn,
  Address,
  BaseAssetId,
} from 'fuels';

const COUNTER_CONTRACT_ID =
  "0x32b066d8139d1c3bdde35c73925c2031802831cdb2feb8b283dbe3c49355e762";
const DEFAULT_ADDRESS = 'Enter Fuel address';

function AccountItem({ address, setCounter }: { address: string; setCounter: React.Dispatch<React.SetStateAction<number>>}) {
  const [isLoading, setLoading] = useState(false);
  const { balance, refetch } = useBalance({
    address,
  });
  const { wallet } = useWallet(address);
  const hasBalance = balance && balance.gte(bn.parseUnits('0.1'));

  useEffect(() => {
    const interval = setInterval(() => refetch(), 2000);
    return () => clearInterval(interval);
  }, [refetch]);

  async function handleTransfer() {
    setLoading(true);
    try {
      const amount = bn.parseUnits('0.1');
      const receiverAddress = prompt('Receiver address', DEFAULT_ADDRESS);
      const receiver = Address.fromString(receiverAddress || DEFAULT_ADDRESS);    
      const resp = await wallet?.transfer(receiver, amount, BaseAssetId, {
        gasPrice: 1,
        gasLimit: 10_000,
      });
      const result = await resp?.waitForResult();
      console.log(result?.status);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function getCount() {
    if (wallet) {
      const contract = CounterAbi__factory.connect(COUNTER_CONTRACT_ID, wallet!);
      const { value } = await contract.functions.count().simulate();
      setCounter(value.toNumber());
    }
  }
 
  async function increment() {
    if (wallet) {
      setLoading(true);
      const contract = CounterAbi__factory.connect(COUNTER_CONTRACT_ID, wallet);
      try {
        await contract.functions.increment().txParams({ gasPrice: 1 }).call();
        getCount();
      } catch (err) {
        console.log("error sending transaction...", err);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <b>Account:</b> {address} | <b>Balance:</b> {balance?.format() || '0'} ETH
      <div className='accountActions'>
        {!hasBalance && (
          <a href={`https://faucet-beta-4.fuel.network/?address=${address}`} target='_blank'>
            <button>
              Get some coins
            </button>
          </a>
        )}
        <button onClick={() => handleTransfer()} disabled={isLoading || !hasBalance}>
          {isLoading ? 'Transferring...' : 'Transfer 0.1 ETH'}
        </button>
        <button onClick={() => increment()} disabled={isLoading || !hasBalance}>
          {isLoading ? 'Incrementing...' : 'Increment the counter'}
        </button>
      </div>
    </div>
  )
}

function LogEvents() {
  const { fuel } = useFuel();
  useEffect(() => {
    const log = (prefix: string) => (data: any) => {
      console.log(prefix, data);
    };
    const logAccounts = log('accounts');
    const logConnection = log('connection');
    const logCurrentAccount = log('currentAccount');

    fuel.on(fuel.events.accounts, logAccounts);
    fuel.on(fuel.events.connection, logConnection);
    fuel.on(fuel.events.currentAccount, logCurrentAccount);
    return () => {
      fuel.off(fuel.events.accounts, logAccounts);
      fuel.off(fuel.events.connection, logConnection);
      fuel.off(fuel.events.currentAccount, logCurrentAccount);
    }
  }, [fuel]);

  return null;
}

function App() {
  const { connect, error, isError, theme, setTheme, isConnecting } =
    useConnectUI();
  const { disconnect } = useDisconnect();
  const { isConnected, refetch } = useIsConnected();
  const { accounts } = useAccounts();
  const [counter, setCounter] = useState<number>(0);
  const lightTheme = theme === 'light';

  useEffect(() => {
    const interval = setInterval(() => refetch(), 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div className="App" data-theme={theme}>
      <LogEvents />
      <div className="Actions">
        <button
          onClick={() => {
            console.log('connect');
            connect();
          }}
        >
          {isConnecting ? 'Connecting' : 'Connect'}
        </button>
        {isConnected && (
          <button onClick={() => disconnect()}>Disconnect</button>
        )}
        <button onClick={() => setTheme(lightTheme ? 'dark' : 'light')}>
          {lightTheme ? '🌙' : '☀️'}
        </button>
      </div>
      {isError && <p className="Error">{error?.message}</p>}
      {isConnected && (
        <div className="Accounts">
          <h3>Connected accounts</h3>
          {accounts?.map((account) => (
            <AccountItem
              key={account}
              address={account}
              setCounter={setCounter}
            />
          ))}
        </div>
      )}
      <div>
        {isConnected && (
          <h3>
            {counter === 0 ? 'Increment to see the counter!' : `Counter: ${counter}`}
          </h3>
        )}
      </div>
    </div>
  );
}

export default App;
