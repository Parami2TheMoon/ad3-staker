// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract TestERC20 is IERC20 {
    using SafeMath for uint256;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    uint256 public override totalSupply;

    constructor(uint256 amountToMint) {
        mint(msg.sender, amountToMint);
        totalSupply = amountToMint;
    }

    function mint(address to, uint256 amount) public {
        require(amount > 0, "Amount should large than 0");
        balanceOf[to] = balanceOf[to].add(amount);
        totalSupply = totalSupply.add(amount);
    }

    function burn(address to, uint256 amount) public {
        require(amount > 0, "Amount should large than 0");
        require(balanceOf[to] >= amount, "Insufficient balance");
        balanceOf[to] = balanceOf[to].sub(amount);
        totalSupply = totalSupply.sub(amount);
    }

    function transfer(address recipient, uint256 amount)
        external
        override
        returns (bool)
    {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(amount);
        balanceOf[recipient] = balanceOf[recipient].add(amount);
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        external
        override
        returns (bool)
    {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        require(balanceOf[sender] >= amount, "Insufficient balance");
        require(
            allowance[sender][msg.sender] >= amount,
            "Insufficient allowance"
        );
        allowance[sender][msg.sender] = allowance[sender][msg.sender].sub(
            amount
        );
        balanceOf[sender] = balanceOf[sender].sub(amount);
        balanceOf[recipient] = balanceOf[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
        return true;
    }
}
