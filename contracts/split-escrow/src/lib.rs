use crate::types::Metadata;

#[contracttype]
pub struct Escrow {
    pub creator: Address,
    pub amount: i128,
    pub active: bool,
    pub metadata: Option<Metadata>, // NEW
}

Update create_escrow()
    pub fn create_escrow(env: Env, creator: Address, amount: i128, metadata: Option<Map<String, String>>) -> Escrow {
    let mut md = metadata.map(|m| {
        let mut meta = Metadata::new(&env);
        for (k, v) in m.iter() {
            meta.insert(k.clone(), v.clone()).expect("Metadata insert failed");
        }
        meta
    });

    Escrow {
        creator,
        amount,
        active: true,
        metadata: md,
    }
}
get_metadata()
pub fn get_metadata(env: Env, escrow: &Escrow) -> Option<Map<String, String>> {
    escrow.metadata.as_ref().map(|md| {
        let mut result = Map::new(&env);
        for (k, v) in md.data.iter() {
            result.insert(k.to_string(), v.to_string());
        }
        result
    })
}
update_metadata()
pub fn update_metadata(env: Env, escrow: &mut Escrow, caller: Address, updates: Map<String, String>) -> Result<(), &'static str> {
    if caller != escrow.creator {
        return Err("Only creator can update metadata");
    }
    if !escrow.active {
        return Err("Escrow not active");
    }

    if let Some(ref mut md) = escrow.metadata {
        for (k, v) in updates.iter() {
            md.update(k.to_string(), v.to_string())?;
        }
    } else {
        let mut md = Metadata::new(&env);
        for (k, v) in updates.iter() {
            md.insert(k.to_string(), v.to_string())?;
        }
        escrow.metadata = Some(md);
    }

    Ok(())
}