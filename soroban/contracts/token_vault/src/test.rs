#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    
    env.mock_all_auths();
    client.initialize(&owner);
    
    assert_eq!(client.get_token_count(), 0);
    assert!(!client.is_paused());
}

#[test]
fn test_store_and_retrieve_token() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    let encrypted_payload = Bytes::from_slice(&env, &[1, 2, 3, 4, 5, 6, 7, 8]);
    let token_hash = BytesN::from_array(&env, &[0u8; 32]);
    let last_4_digits = String::from_str(&env, "1234");
    let card_network = String::from_str(&env, "visa");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    let metadata = client.store_token(
        &user,
        &encrypted_payload,
        &token_hash.clone().into(),
        &last_4_digits,
        &card_network,
        &expires_at,
    );
    
    assert_eq!(metadata.user, user);
    assert_eq!(metadata.last_4_digits, last_4_digits);
    assert_eq!(metadata.card_network, card_network);
    assert_eq!(metadata.status, String::from_str(&env, "active"));
    assert_eq!(client.get_token_count(), 1);
    
    // Retrieve token by hash
    let retrieved = client.retrieve_token(&user, &token_hash).unwrap();
    assert_eq!(retrieved.encrypted_payload, encrypted_payload);
    assert_eq!(retrieved.token_hash, token_hash);
}

#[test]
fn test_store_multiple_cards() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    // Store first card (Visa)
    let payload1 = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let hash1 = BytesN::from_array(&env, &[1u8; 32]);
    let last4_1 = String::from_str(&env, "1234");
    let network1 = String::from_str(&env, "visa");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    client.store_token(&user, &payload1, &hash1.clone().into(), &last4_1, &network1, &expires_at);
    assert_eq!(client.get_token_count(), 1);
    assert_eq!(client.get_user_token_count(&user), 1);
    
    // Store second card (Mastercard)
    let payload2 = Bytes::from_slice(&env, &[5, 6, 7, 8]);
    let hash2 = BytesN::from_array(&env, &[2u8; 32]);
    let last4_2 = String::from_str(&env, "5678");
    let network2 = String::from_str(&env, "mastercard");
    
    client.store_token(&user, &payload2, &hash2.clone().into(), &last4_2, &network2, &expires_at);
    assert_eq!(client.get_token_count(), 2);
    assert_eq!(client.get_user_token_count(&user), 2);
    
    // Store third card (RuPay)
    let payload3 = Bytes::from_slice(&env, &[9, 10, 11, 12]);
    let hash3 = BytesN::from_array(&env, &[3u8; 32]);
    let last4_3 = String::from_str(&env, "9012");
    let network3 = String::from_str(&env, "rupay");
    
    client.store_token(&user, &payload3, &hash3.clone().into(), &last4_3, &network3, &expires_at);
    assert_eq!(client.get_token_count(), 3);
    assert_eq!(client.get_user_token_count(&user), 3);
    
    // Retrieve all tokens
    let all_tokens = client.retrieve_all_tokens(&user);
    assert_eq!(all_tokens.len(), 3);
    
    // Retrieve individual tokens by hash
    let card1 = client.retrieve_token(&user, &hash1).unwrap();
    assert_eq!(card1.last_4_digits, last4_1);
    assert_eq!(card1.card_network, network1);
    
    let card2 = client.retrieve_token(&user, &hash2).unwrap();
    assert_eq!(card2.last_4_digits, last4_2);
    assert_eq!(card2.card_network, network2);
    
    let card3 = client.retrieve_token(&user, &hash3).unwrap();
    assert_eq!(card3.last_4_digits, last4_3);
    assert_eq!(card3.card_network, network3);
}

#[test]
#[should_panic(expected = "Token with this hash already exists")]
fn test_store_duplicate_hash_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    let encrypted_payload = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let token_hash = BytesN::from_array(&env, &[0u8; 32]);
    let last_4_digits = String::from_str(&env, "1234");
    let card_network = String::from_str(&env, "visa");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    // Store first token
    client.store_token(&user, &encrypted_payload, &token_hash.clone().into(), &last_4_digits, &card_network, &expires_at);
    
    // Attempt to store with same hash — should panic
    client.store_token(&user, &encrypted_payload, &token_hash.clone().into(), &last_4_digits, &card_network, &expires_at);
}

#[test]
fn test_revoke_token() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    // Store two cards
    let payload1 = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let hash1 = BytesN::from_array(&env, &[1u8; 32]);
    let last4_1 = String::from_str(&env, "1234");
    let network1 = String::from_str(&env, "mastercard");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    client.store_token(&user, &payload1, &hash1.clone().into(), &last4_1, &network1, &expires_at);
    
    let payload2 = Bytes::from_slice(&env, &[5, 6, 7, 8]);
    let hash2 = BytesN::from_array(&env, &[2u8; 32]);
    let last4_2 = String::from_str(&env, "5678");
    let network2 = String::from_str(&env, "visa");
    
    client.store_token(&user, &payload2, &hash2.clone().into(), &last4_2, &network2, &expires_at);
    assert_eq!(client.get_token_count(), 2);
    assert_eq!(client.get_user_token_count(&user), 2);
    
    // Revoke first card
    let revoked = client.revoke_token(&user, &hash1);
    assert!(revoked);
    
    let status = client.get_token_status(&user, &hash1).unwrap();
    assert_eq!(status, String::from_str(&env, "revoked"));
    
    // Global count decremented, user list shrunk
    assert_eq!(client.get_token_count(), 1);
    assert_eq!(client.get_user_token_count(&user), 1);
    
    // Second card still active
    let card2 = client.retrieve_token(&user, &hash2).unwrap();
    assert_eq!(card2.status, String::from_str(&env, "active"));
}

#[test]
fn test_expired_token() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    let encrypted_payload = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let token_hash = BytesN::from_array(&env, &[0u8; 32]);
    let last_4_digits = String::from_str(&env, "5678");
    let card_network = String::from_str(&env, "rupay");
    
    // Set expiration to 1 second from now
    let expires_at = env.ledger().timestamp() + 1;
    
    client.store_token(&user, &encrypted_payload, &token_hash.clone().into(), &last_4_digits, &card_network, &expires_at);
    
    // Fast forward time by 2 seconds
    env.ledger().with_mut(|li| {
        li.timestamp += 2;
    });
    
    // Retrieve should return expired token
    let retrieved = client.retrieve_token(&user, &token_hash).unwrap();
    assert_eq!(retrieved.status, String::from_str(&env, "expired"));
}

#[test]
fn test_pause_blocks_store() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    
    client.initialize(&owner);
    
    assert!(!client.is_paused());
    
    client.pause();
    assert!(client.is_paused());
    
    client.unpause();
    assert!(!client.is_paused());
}

#[test]
#[should_panic(expected = "Contract is paused")]
fn test_store_while_paused() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    client.pause();
    
    let encrypted_payload = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let token_hash = BytesN::from_array(&env, &[0u8; 32]);
    let last_4_digits = String::from_str(&env, "9999");
    let card_network = String::from_str(&env, "visa");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    // Should panic — contract is paused
    client.store_token(&user, &encrypted_payload, &token_hash.clone().into(), &last_4_digits, &card_network, &expires_at);
}

#[test]
fn test_events() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    let encrypted_payload = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let token_hash = BytesN::from_array(&env, &[0u8; 32]);
    let last_4_digits = String::from_str(&env, "9999");
    let card_network = String::from_str(&env, "visa");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    client.store_token(&user, &encrypted_payload, &token_hash.clone().into(), &last_4_digits, &card_network, &expires_at);
    
    // Token was stored
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_retrieve_all_tokens_empty() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVault, ());
    let client = TokenVaultClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&owner);
    
    // Set permissions so user can query (store a card then revoke it to set perms)
    let payload = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let hash = BytesN::from_array(&env, &[0u8; 32]);
    let last4 = String::from_str(&env, "0000");
    let net = String::from_str(&env, "visa");
    let expires_at = env.ledger().timestamp() + 31536000;
    
    client.store_token(&user, &payload, &hash.clone().into(), &last4, &net, &expires_at);
    client.revoke_token(&user, &hash);
    
    // User's active token list should be empty after revocation
    let all = client.retrieve_all_tokens(&user);
    assert_eq!(all.len(), 0);
}
