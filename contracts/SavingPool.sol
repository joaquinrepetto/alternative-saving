// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IPoolDataProvider} from "@aave/core-v3/contracts/interfaces/IPoolDataProvider.sol";
import {DataTypes} from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";

contract SavingPool {
    address owner;
    uint256 startDate;
    uint256 endDate;
    uint256 totalDeposit;
    mapping(address => uint256) public balances;
    string public purpose = "Holis!";

    // the polygon mainnet AAVE v3 lending pool
    IPool pool = IPool(0x794a61358D6845594F94dc1DB02A252b5b4814aD);
    IPoolDataProvider dataProvider;

    // aave interest bearing polygon DAI (V3)
    IERC20 aDai = IERC20(0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE);

    // the DAI stablecoin
    IERC20 dai = IERC20(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063);

    constructor() {
        owner = msg.sender;
        console.log("owner es:", msg.sender);
        startDate = block.timestamp + 60 seconds;
    }

    function setPurpose(string memory _purpose) public {
        purpose = _purpose;
    }

    function depositDai(uint256 _amount) public returns (bool success) {}

    function transferFundsToPool() public {}

    function getInterestRate()
        public
        view
        returns (DataTypes.ReserveData memory reserveData)
    {}

    function withdraw() public {}

    function reclaimInteret() public {}
}
