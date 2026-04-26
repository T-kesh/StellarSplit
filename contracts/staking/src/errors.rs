use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InsufficientBalance = 3,
    InsufficientStake = 4,
    CooldownActive = 5,
    InvalidAmount = 6,
    NoRewardsToClaim = 7,
    Unauthorized = 8,
}
