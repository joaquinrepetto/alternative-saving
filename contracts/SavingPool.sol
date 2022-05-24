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
    string public purpose = "El primero";

    // the mainnet AAVE v2 lending pool
    // IPool pool = IPool(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);

    // the polygon mainnet AAVE v3 lending pool
    IPool pool = IPool(0x794a61358D6845594F94dc1DB02A252b5b4814aD);
    IPoolDataProvider dataProvider;

    // aave interest bearing DAI (V2)
    // IERC20 aDai = IERC20(0x028171bCA77440897B824Ca71D1c56caC55b68A3);

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

    function depositDai(uint256 _amount) public returns (bool success) {
        require(
            block.timestamp <= startDate,
            "Inscripcion no disponible, inversion en curso"
        );
        require((_amount > 0), "Amount must be greater than 0");

        success = dai.transferFrom(msg.sender, address(this), _amount);
        require(success, "Failed to transfer DAI");
        balances[msg.sender] += _amount;

        return success;
    }

    function transferFundsToPool() public {
        require(msg.sender == owner, "Only owner can transfer funds to pool");
        require(block.timestamp > startDate, "Inscripcion aun abierta");

        totalDeposit = dai.balanceOf(address(this));

        dai.approve(address(pool), totalDeposit);
        pool.supply(address(dai), totalDeposit, address(this), 0);
        endDate = block.timestamp + 21 seconds;
    }

    function getInterestRate()
        public
        view
        returns (DataTypes.ReserveData memory reserveData)
    {
        // uint256 totalBalance = aDai.balanceOf(address(this));
        reserveData = pool.getReserveData(address(dai));
        return reserveData;
    }

    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        require(block.timestamp > endDate, "Inversion aun en curso");
        aDai.approve(address(pool), type(uint256).max);
        pool.withdraw(address(dai), type(uint256).max, address(this));
    }

    function reclaimInteret() public {
        require(block.timestamp > endDate, "Inversion aun en curso");
        require(
            dai.balanceOf(address(this)) > 0,
            "No hay intereses a reclamar"
        );
        uint256 sharePercent = balances[msg.sender] / totalDeposit;
        uint256 interest = sharePercent *
            sharePercent *
            dai.balanceOf(address(this));

        console.log("Deposito", sharePercent, "Interes:", interest);
        dai.transfer(msg.sender, interest);
    }
}
