use soroban_sdk::{contracttype, symbol, Env};
use soroban_sdk::vec::Vec;
use soroban_sdk::map::Map;

pub const MAX_KEYS: usize = 5;
pub const MAX_KEY_LEN: usize = 64;
pub const MAX_VALUE_LEN: usize = 64;

#[contracttype]
#[derive(Clone)]
pub struct Metadata {
    pub data: Map<symbol!(String), symbol!(String)>,
}

impl Metadata {
    pub fn new(env: &Env) -> Self {
        Self { data: Map::new(env) }
    }

    pub fn insert(&mut self, key: String, value: String) -> Result<(), &'static str> {
        if self.data.len() >= MAX_KEYS {
            return Err("Metadata max keys reached");
        }
        if key.len() > MAX_KEY_LEN || value.len() > MAX_VALUE_LEN {
            return Err("Key or value length exceeded");
        }
        self.data.insert(symbol!(key), symbol!(value));
        Ok(())
    }

    pub fn update(&mut self, key: String, value: String) -> Result<(), &'static str> {
        if !self.data.contains_key(&symbol!(key)) {
            return Err("Key does not exist");
        }
        if value.len() > MAX_VALUE_LEN {
            return Err("Value length exceeded");
        }
        self.data.insert(symbol!(key), symbol!(value));
        Ok(())
    }
    
}