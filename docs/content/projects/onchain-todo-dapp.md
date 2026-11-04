---
title: On-Chain Todo List dApp
slug: onchain-todo-dapp
order: 7
category: Web3 · Decentralized Application
year: "2026"  # src: repo created 2026-06-18 (GitHub API)
visibility: Public team project
summary: A todo list where each task lives in a Solidity smart contract and is managed from a React app through MetaMask.
metrics:
  - value: "9"
    label: Contract tests Kevin added
stack: [Solidity, Hardhat, React, Vite, Tailwind CSS, ethers.js, MetaMask, Sepolia]
links:
  - label: Repository
    url: https://github.com/Trenttzzz/todo-list-dapp-project
  - label: Live demo
    url: https://todo-list-dapp-project.vercel.app
contribution: Kevin built the Web3 integration and the tests. He wrote the wallet and contract hooks, the contract helper, the frontend wiring, the Hardhat config and the deploy script. He then expanded the tests.
seo_description: Blockchain todo list dApp with a Solidity contract, React frontend and MetaMask. Tasks are stored on-chain and deployed to Sepolia.
---
<!-- src for stack, links, contribution: repo README todo-list-dapp, GitHub API (contributors 12 + 7 + 1 = 20 commits), Kevin's commits 038c6ee 2642da0 -->

## Problem
A course project asked for a decentralized application. The chosen idea was a todo list whose data lives in a smart contract and not in local storage. <!-- src: repo README, Deskripsi -->

## How it works
Each todo belongs to a wallet and is stored in a Solidity contract. The React frontend uses ethers.js and MetaMask. Reads go straight to the chain without a prompt, and writes open a MetaMask request and then refresh the list after confirmation. The contract runs on a local Hardhat chain and on Sepolia. <!-- src: repo README, Arsitektur dApp -->

### Pipeline
- user | User | Opens the React app. <!-- src: README architecture -->
- ui | React frontend | Shows todos, filters and transaction status. <!-- src: README features -->
- ethers | ethers.js | Builds a contract instance with a provider or a signer. <!-- src: README read and write flows -->
- wallet | MetaMask | The user confirms each write. <!-- src: README write flow -->
- chain | Hardhat local or Sepolia | Runs the transaction. <!-- src: README architecture -->
- contract | TodoList contract | Stores todos per wallet and emits events. <!-- src: README contract section -->
- events | Event listener | The frontend refreshes when events arrive. <!-- src: README bonus features -->
- user -> ui
- ui -> ethers
- ethers -> wallet
- wallet -> chain
- chain -> contract
- contract -> events
- events -> ui

## Key decisions
- Todos are stored on-chain, and only the owner can toggle, delete or reorder them. <!-- src: README contract rules -->
- Deadlines are stored as a timestamp and the UI shows when one has passed. The contract does not act on it, because a state change needs a transaction. <!-- src: README, Catatan deadline -->
- The public demo uses Sepolia, because outside users cannot reach a local chain. <!-- src: README, Deploy ke Sepolia -->
- Wallet state lives in one hook that follows MetaMask account and network changes. Unsupported networks block reads and writes with a message. <!-- src: todo-list-dapp-project frontend/src/hooks/useWallet.js (accountsChanged, chainChanged), useTodoContract.js (isSupportedChain checks) -->
- Reads use a provider and writes use a signer, and a write waits for the receipt before the list reloads. <!-- src: frontend/src/hooks/useTodoContract.js getReadContract, getWriteContract, addTodo -->
- The frontend listens to the contract events and reloads only when the event belongs to the connected wallet. Listeners are removed on cleanup. <!-- src: frontend/src/hooks/useTodoContract.js lines 290 to 312 -->

## Results
- Contract deployed to Sepolia and the frontend is live on Vercel. <!-- src: README, GitHub homepage field -->
- Features include wallet connect, add, complete, delete, drag-and-drop reorder, deadlines and transaction feedback. <!-- src: README -->
- 26 contract tests cover create, complete, delete, reorder, per-user isolation and revert cases. <!-- src: todo-list-dapp-project test/TodoList.test.js (26 it blocks), commits 038c6ee and 2642da0. Commit 2642da0 says coverage over 95%, but no coverage report or CI config is in the repo so it is not shown as a metric -->
