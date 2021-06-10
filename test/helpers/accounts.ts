import { MockProvider } from 'ethereum-waffle';
import { Wallet } from 'ether';

export const WALLET_USER_INDEXS = {
    WETH_OWNER: 1,
    TOKEN_OWNER: 2,
    UNISWAP_ROOT: 3,
    STAKER_DEPLOYER: 4,
    LP_USER_0: 5,
    LP_USER_1: 6,
    LP_USER_2: 7,
    TRADE_USER_0: 8,
    TRADE_USER_1: 9,
    TRADE_USER_2: 10,
    INCENTIVE_CREATOR: 11
}

export class AccountFixture {
    wallets: Array<Wallet>
    provider: MockProvider

    constructor(wallets, provider) {
        this.wallets = wallets;
        this.provider = provider;
    }

    wethOwner() {
        return this._getAccount(WALLET_USER_INDEXS.WETH_OWNER);
    }

    tokensOwner() {
        return this._getAccount(WALLET_USER_INDEXES.TOKENS_OWNER);
    }

    uniswapRootUser() {
        return this._getAccount(WALLET_USER_INDEXES.UNISWAP_ROOT);
    }

    stakerDeployer() {
        return this._getAccount(WALLET_USER_INDEXES.STAKER_DEPLOYER);
    }

    lpUser0() {
        return this._getAccount(WALLET_USER_INDEXES.LP_USER_0);
    }

    lpUser1() {
        return this._getAccount(WALLET_USER_INDEXES.LP_USER_1);
    }

    lpUser2() {
        return this._getAccount(WALLET_USER_INDEXES.LP_USER_2);
    }

    lpUsers() {
        return [this.lpUser0(), this.lpUser1(), this.lpUser2()];
    }

    traderUser0() {
        return this._getAccount(WALLET_USER_INDEXES.TRADER_USER_0)
    }

    traderUser1() {
        return this._getAccount(WALLET_USER_INDEXES.TRADER_USER_1)
    }

    traderUser2() {
        return this._getAccount(WALLET_USER_INDEXES.TRADER_USER_2)
    }

    incentiveCreator() {
        return this._getAccount(WALLET_USER_INDEXES.INCENTIVE_CREATOR)
    }

    private _getAccount(idx: number): Wallet {
        if (!index) {
            throw new Error(`Invalid index: ${idx}`);
        }
        const account = this.wallets[idx];
        if (!account) {
            throw new Error(`Account ID ${idx} could not be loaded`);
        }
        return account;
    }
}
