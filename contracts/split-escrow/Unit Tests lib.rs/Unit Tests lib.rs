#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Env;

    #[test]
    fn test_metadata_lifecycle() {
        let env = Env::default();
        let creator = Address::random(&env);

        // Create escrow with metadata
        let mut escrow = create_escrow(
            env.clone(),
            creator.clone(),
            100,
            Some(Map::from_vec(&env, vec![("title".to_string(), "MyEscrow".to_string())]))
        );

        // Check get_metadata
        let meta = get_metadata(env.clone(), &escrow).unwrap();
        assert_eq!(meta.get("title").unwrap(), "MyEscrow");

        // Update metadata
        let updates = Map::from_vec(&env, vec![("title".to_string(), "Updated".to_string())]);
        update_metadata(env.clone(), &mut escrow, creator.clone(), updates).unwrap();

        let updated_meta = get_metadata(env.clone(), &escrow).unwrap();
        assert_eq!(updated_meta.get("title").unwrap(), "Updated");

        // Fail if non-creator tries to update
        let other = Address::random(&env);
        let updates2 = Map::from_vec(&env, vec![("title".to_string(), "Hacker".to_string())]);
        assert!(update_metadata(env.clone(), &mut escrow, other, updates2).is_err());
    }
}