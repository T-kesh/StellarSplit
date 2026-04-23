use soroban_sdk::{symbol_short, Address, Env};

pub fn emit_initialized(env: &Env, admin: &Address, token: &Address) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("init")),
        (admin, token),
    );
}

pub fn emit_staked(env: &Env, staker: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("stake")),
        (staker, amount),
    );
}

pub fn emit_unstaked(env: &Env, staker: &Address, amount: i128, unlock_time: u64) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("unstake")),
        (staker, amount, unlock_time),
    );
}

pub fn emit_rewards_claimed(env: &Env, staker: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("claim")),
        (staker, amount),
    );
}

pub fn emit_delegated(env: &Env, delegator: &Address, delegatee: &Option<Address>) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("delegate")),
        (delegator.clone(), delegatee.clone()),
    );
}

pub fn emit_withdrawn(env: &Env, staker: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("withdraw")),
        (staker, amount),
    );
}

pub fn emit_reward_deposited(env: &Env, admin: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("deposit")),
        (admin, amount),
    );
}
