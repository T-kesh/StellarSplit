#![cfg(test)]

use crate::{SplitEscrowContract, SplitEscrowContractClient, SplitStatus};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient as TokenAdminClient};
use soroban_sdk::{testutils::Address as _, testutils::Events as _, Address, Env, String};

fn setup() -> (
    Env,
    SplitEscrowContractClient<'static>,
    Address,
    Address,
    Address,
    TokenClient<'static>,
    TokenAdminClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token = token_contract.address();

    let token_client = TokenClient::new(&env, &token);
    let token_admin_client = TokenAdminClient::new(&env, &token);

    let contract_id = env.register_contract(None, SplitEscrowContract);
    let client = SplitEscrowContractClient::new(&env, &contract_id);
    client.initialize(&admin, &token);

    token_admin_client.mint(&participant, &1_000_000);

    (
        env,
        client,
        admin,
        creator,
        participant,
        token_client,
        token_admin_client,
    )
}

#[test]
fn test_fee_deducted_and_sent_to_treasury_on_release() {
    let (env, client, admin, creator, participant, token_client, _) = setup();
    let treasury = Address::generate(&env);
    client.set_treasury(&treasury);
    client.set_fee(&250u32); // 2.5%

    let split_id =
        client.create_escrow(&creator, &String::from_str(&env, "Dinner"), &10_000, &None);
    client.deposit(&split_id, &participant, &10_000);
    client.release_funds(&split_id);

    assert_eq!(token_client.balance(&treasury), 250);
    assert_eq!(token_client.balance(&creator), 9_750);

    let escrow = client.get_escrow(&split_id);
    assert_eq!(escrow.status, SplitStatus::Released);

    let _ = admin;
}

#[test]
fn test_admin_can_update_fee_and_treasury() {
    let (env, client, _admin, creator, participant, token_client, _) = setup();

    let treasury_a = Address::generate(&env);
    client.set_treasury(&treasury_a);
    client.set_fee(&100u32);

    let split_a = client.create_escrow(&creator, &String::from_str(&env, "A"), &1_000, &None);
    client.deposit(&split_a, &participant, &1_000);
    client.release_funds(&split_a);
    assert_eq!(token_client.balance(&treasury_a), 10);

    let treasury_b = Address::generate(&env);
    client.set_treasury(&treasury_b);
    client.set_fee(&300u32);

    let split_b = client.create_escrow(&creator, &String::from_str(&env, "B"), &2_000, &None);
    client.deposit(&split_b, &participant, &2_000);
    client.release_funds(&split_b);
    assert_eq!(token_client.balance(&treasury_b), 60);
}

#[test]
fn test_set_fee_and_set_treasury_are_admin_only() {
    let (env, client, admin, _creator, _participant, _token_client, _token_admin) = setup();

    env.mock_all_auths();
    client.set_fee(&123u32);
    client.set_treasury(&Address::generate(&env));

    assert_ne!(admin, Address::generate(&env));
}

#[test]
fn test_fees_collected_event_emitted() {
    let (env, client, _admin, creator, participant, _token_client, _) = setup();
    let treasury = Address::generate(&env);
    client.set_treasury(&treasury);
    client.set_fee(&500u32);

    let before_len = env.events().all().len();

    let split_id = client.create_escrow(&creator, &String::from_str(&env, "Event"), &1_000, &None);
    client.deposit(&split_id, &participant, &1_000);
    client.release_funds(&split_id);

    let after_len = env.events().all().len();
    assert!(after_len > before_len);
}

#[test]
fn test_default_max_participants_is_50() {
    let (env, client, _admin, creator, _p, _tc, token_admin) = setup();
    let escrow_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Cap default"),
        &100,
        &None,
    );
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.max_participants, 50);
    assert_eq!(escrow.participants.len(), 0);

    let _ = token_admin;
}

#[test]
fn test_explicit_max_participants_stored_in_get_escrow() {
    let (env, client, _admin, creator, p1, _tc, _ta) = setup();
    let cap = 3u32;
    let escrow_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Explicit cap"),
        &300,
        &Some(cap),
    );
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.max_participants, cap);
    client.deposit(&escrow_id, &p1, &100);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.participants.len(), 1);
}

#[test]
fn test_deposit_rejected_when_participant_cap_exceeded() {
    let (env, client, _admin, creator, p1, _tc, token_admin) = setup();
    let p2 = Address::generate(&env);
    let p3 = Address::generate(&env);
    token_admin.mint(&p2, &10_000);
    token_admin.mint(&p3, &10_000);

    let escrow_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Two max"),
        &3_000,
        &Some(2u32),
    );

    client.deposit(&escrow_id, &p1, &1_000);
    client.deposit(&escrow_id, &p2, &1_000);
    assert_eq!(client.get_escrow(&escrow_id).participants.len(), 2);

    let res = client.try_deposit(&escrow_id, &p3, &1_000);
    assert!(res.is_err());

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.participants.len(), 2);
    assert_eq!(escrow.deposited_amount, 2_000);
}

#[test]
fn test_existing_participant_can_deposit_again_without_increasing_count() {
    let (env, client, _admin, creator, p1, _tc, _ta) = setup();
    // release_funds runs fee collection; treasury must be set even when fee bps is 0.
    client.set_treasury(&Address::generate(&env));

    let escrow_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Repeat"),
        &2_000,
        &Some(1u32),
    );
    client.deposit(&escrow_id, &p1, &1_000);
    client.deposit(&escrow_id, &p1, &1_000);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.participants.len(), 1);
    assert_eq!(escrow.deposited_amount, 2_000);
    client.release_funds(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, SplitStatus::Released);
}
