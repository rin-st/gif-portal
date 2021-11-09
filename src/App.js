import { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import kp from './keypair.json';
import idl from './idl.json';

const { SystemProgram, Keypair } = web3;

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');

const opts = {
	preflightCommitment: 'processed',
};

const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
	const [walletAddress, setWalletAddress] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [gifList, setGifList] = useState([]);
	/*
	 * This function holds the logic for deciding if a Phantom Wallet is
	 * connected or not
	 */
	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window;

			if (solana) {
				if (solana.isPhantom) {
					console.log('Phantom wallet found!');

					/*
					 * The solana object gives us a function that will allow us to connect
					 * directly with the user's wallet!
					 */
					const response = await solana.connect({ onlyIfTrusted: true });
					console.log(
						'Connected with Public Key:',
						response.publicKey.toString()
					);

					setWalletAddress(response.publicKey.toString());
				}
			} else {
				alert('Solana object not found! Get a Phantom Wallet 👻');
			}
		} catch (error) {
			console.error(error);
		}
	};

	const connectWallet = async () => {
		const { solana } = window;

		if (solana) {
			const response = await solana.connect();
			console.log('Connected with Public Key:', response.publicKey.toString());
			setWalletAddress(response.publicKey.toString());
		}
	};

	const sendGif = async () => {
		if (inputValue.length === 0) {
			console.log('No gif link given!');
			return;
		}
		console.log('Gif link:', inputValue);
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);

			await program.rpc.addGif(inputValue, {
				accounts: {
					baseAccount: baseAccount.publicKey,
				},
			});
			console.log('GIF sucesfully sent to program', inputValue);

			setInputValue('');
			await getGifList();
		} catch (error) {
			console.log('Error sending GIF:', error);
		}
	};

	const getProvider = () => {
		const connection = new Connection(network, opts.preflightCommitment);
		const provider = new Provider(
			connection,
			window.solana,
			opts.preflightCommitment
		);
		console.log(provider.wallet.publicKey, '<<< wallet');
		return provider;
	};

	const createGifAccount = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			console.log('ping');
			await program.rpc.startStuffOff({
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId,
				},
				signers: [baseAccount],
			});
			console.log(
				'Created a new BaseAccount w/ address:',
				baseAccount.publicKey.toString()
			);
			await getGifList();
		} catch (error) {
			console.log('Error creating BaseAccount account:', error);
		}
	};

	const upvoteGif = (gifAddr) => async () => {
		console.log('Gif link:', gifAddr);
		try {
			const provider = getProvider();

			const program = new Program(idl, programID, provider);

			await program.rpc.upvoteGif(gifAddr, {
				accounts: {
					baseAccount: baseAccount.publicKey,
				},
			});
			console.log('GIF sucesfully sent to program', inputValue);

			await getGifList();
		} catch (error) {
			console.log('Error sending GIF:', error);
		}
	};

	const onInputChange = (event) => {
		const { value } = event.target;
		setInputValue(value);
	};

	const renderNotConnectedContainer = () => (
		<button
			className="cta-button connect-wallet-button"
			onClick={connectWallet}
		>
			Connect to Wallet
		</button>
	);

	const renderConnectedContainer = () => {
		if (gifList === null) {
			return (
				<div className="connected-container">
					<button
						className="cta-button submit-gif-button"
						onClick={createGifAccount}
					>
						Do One-Time Initialization For GIF Program Account
					</button>
				</div>
			);
		} else {
			return (
				<div className="connected-container">
					<input
						type="text"
						placeholder="Enter gif link!"
						value={inputValue}
						onChange={onInputChange}
					/>
					<button className="cta-button submit-gif-button" onClick={sendGif}>
						Submit
					</button>
					<div className="gif-grid">
						{/* We use index as the key instead, also, the src is now item.gifLink */}
						{gifList.map((item, index) => (
							<div className="gif-item" key={index}>
								<img src={item.gifLink} alt="gif-link" />
								<div className="gif-from-address">
									from:&nbsp;<span>{item.userAddress.toString()}</span>
								</div>
								<div className="gif-likes">
									<button
										className="heart-button"
										onClick={upvoteGif(item.gifLink)}
									>
										❤️
									</button>
									&nbsp;{item.likes}
								</div>
							</div>
						))}
					</div>
				</div>
			);
		}
	};

	useEffect(() => {
		window.addEventListener('load', async (event) => {
			await checkIfWalletIsConnected();
		});
	}, []);

	const getGifList = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			const account = await program.account.baseAccount.fetch(
				baseAccount.publicKey
			);

			console.log('Got the account', account);
			setGifList(account.gifList);
		} catch (error) {
			console.log('Error in getGifs: ', error);
			setGifList(null);
		}
	};

	useEffect(() => {
		if (walletAddress) {
			console.log('Fetching GIF list...');
			getGifList();
		}
	}, [walletAddress]);

	return (
		<div className="App">
			<div className={walletAddress ? 'authed-container' : 'container'}>
				<div className="header-container">
					<p className="header">🖼 GIF Portal</p>
					<p className="sub-text">
						View your GIF collection in the metaverse ✨
					</p>
					{!walletAddress && renderNotConnectedContainer()}
					{walletAddress && renderConnectedContainer()}
				</div>
				<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built on @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
};

export default App;
