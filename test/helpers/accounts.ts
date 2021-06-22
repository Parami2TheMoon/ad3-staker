import { MockProvider } from 'ethereum-waffle';
import { Wallet } from 'ethers';

export const WALLET_USER_INDEXES = {
    WETH_OWNER: 0,
    TOKENS_OWNER: 1,
    GOVERANCE: 2,
    STAKER_DEPLOYER: 3,
    LP_USER_0: 4,
    LP_USER_1: 5,
    LP_USER_2: 6,
    TRADER_USER_0: 7,
    TRADER_USER_1: 8,
    TRADER_USER_2: 9,
    INCENTIVE_CREATOR: 10
}

export class AccountFixture {
    wallets: Array<Wallet>
    provider: MockProvider

    constructor(wallets, provider) {
        this.wallets = wallets;
        this.provider = provider;
    }

    wethOwner() {
        return this._getAccount(WALLET_USER_INDEXES.WETH_OWNER);
    }

    tokensOwner() {
        return this._getAccount(WALLET_USER_INDEXES.TOKENS_OWNER);
    }

    goverance() {
        return this._getAccount(WALLET_USER_INDEXES.GOVERANCE);
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
        if (idx < 0 || idx === undefined || idx === null) {
            throw new Error(`Invalid index: ${idx}`);
        }
        const account = this.wallets[idx];
        if (!account) {
            throw new Error(`Account ID ${idx} could not be loaded`);
        }
        return account;
    }
}
