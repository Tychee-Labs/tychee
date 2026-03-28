#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, String, Vec};

/// Storage keys
#[contracttype]
pub enum DataKey {
    TokenData(Address, BytesN<32>), // (User address, token_hash) -> encrypted token data
    UserTokenList(Address),         // User address -> Vec<BytesN<32>> of token hashes
    Permissions(Address),           // User address -> access permissions
    Owner,                          // Contract owner
    TokenCount,                     // Total tokens stored (global)
}

/// Token metadata structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMetadata {
    pub user: Address,
    pub encrypted_payload: Bytes,  // AES-GCM encrypted card data
    pub token_hash: BytesN<32>,    // SHA-256 hash for indexing
    pub last_4_digits: String,     // Last 4 digits for display
    pub card_network: String,      // visa, mastercard, rupay
    pub status: String,            // active, revoked, expired
    pub created_at: u64,           // Unix timestamp
    pub expires_at: u64,           // Unix timestamp
}

/// Access permission levels
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Permission {
    Owner,      // Full access
    Read,       // Can read own tokens
    Revoked,    // No access
}

#[contract]
pub struct TokenVault;

#[contractimpl]
impl TokenVault {
    /// Initialize the contract with an owner
    pub fn initialize(env: Env, owner: Address) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic!("Already initialized");
        }
        
        owner.require_auth();
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::TokenCount, &0u32);
    }

    /// Store encrypted card token
    /// Multiple cards per user are supported, identified by unique token_hash.
    pub fn store_token(
        env: Env,
        user: Address,
        encrypted_payload: Bytes,
        token_hash: Bytes,
        last_4_digits: String,
        card_network: String,
        expires_at: u64,
    ) -> TokenMetadata {
        user.require_auth();

        // Convert dynamic Bytes to strict BytesN<32> array
        let token_hash_bytesn: BytesN<32> = token_hash.try_into().unwrap_or_else(|_| {
            panic!("token_hash must be exactly 32 bytes");
        });

        // Check if contract is paused
        if Self::is_paused(env.clone()) {
            panic!("Contract is paused");
        }

        // Check if a token with this exact hash already exists for this user
        let token_key = DataKey::TokenData(user.clone(), token_hash_bytesn.clone());
        if env.storage().persistent().has(&token_key) {
            panic!("Token with this hash already exists for this user");
        }

        let current_time = env.ledger().timestamp();
        
        if expires_at <= current_time {
            panic!("Expiration date must be in the future");
        }

        let metadata = TokenMetadata {
            user: user.clone(),
            encrypted_payload: encrypted_payload.clone(),
            token_hash: token_hash_bytesn.clone(),
            last_4_digits: last_4_digits.clone(),
            card_network: card_network.clone(),
            status: String::from_str(&env, "active"),
            created_at: current_time,
            expires_at,
        };

        // Store token data keyed by (user, token_hash)
        env.storage().persistent().set(&token_key, &metadata);
        
        // Update user's token list
        let list_key = DataKey::UserTokenList(user.clone());
        let mut token_list: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));
        token_list.push_back(token_hash_bytesn.clone());
        env.storage().persistent().set(&list_key, &token_list);

        // Set permission (once per user, idempotent)
        if !env.storage().persistent().has(&DataKey::Permissions(user.clone())) {
            env.storage().persistent().set(&DataKey::Permissions(user.clone()), &Permission::Owner);
        }

        // Increment global token count
        let mut count: u32 = env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::TokenCount, &count);

        // Emit event
        env.events().publish(
            (symbol_short!("store"), user.clone()),
            (token_hash_bytesn, card_network, current_time)
        );

        metadata
    }

    /// Retrieve a specific encrypted token by hash (only owner can access)
    pub fn retrieve_token(env: Env, user: Address, token_hash: BytesN<32>) -> Option<TokenMetadata> {
        user.require_auth();

        // Check permissions
        let permission: Option<Permission> = env.storage().persistent().get(&DataKey::Permissions(user.clone()));
        
        match permission {
            Some(Permission::Owner) | Some(Permission::Read) => {
                let token_key = DataKey::TokenData(user.clone(), token_hash);
                let metadata: Option<TokenMetadata> = env.storage().persistent().get(&token_key);
                
                if let Some(ref token) = metadata {
                    // Check if token is expired
                    let current_time = env.ledger().timestamp();
                    if current_time > token.expires_at {
                        // Auto-revoke expired tokens
                        let mut expired_token = token.clone();
                        expired_token.status = String::from_str(&env, "expired");
                        env.storage().persistent().set(&token_key, &expired_token);
                        return Some(expired_token);
                    }
                    
                    // Emit access event
                    env.events().publish(
                        (symbol_short!("access"), user),
                        current_time
                    );
                }
                
                metadata
            },
            _ => None
        }
    }

    /// Retrieve all tokens for a user
    pub fn retrieve_all_tokens(env: Env, user: Address) -> Vec<TokenMetadata> {
        user.require_auth();

        let permission: Option<Permission> = env.storage().persistent().get(&DataKey::Permissions(user.clone()));

        match permission {
            Some(Permission::Owner) | Some(Permission::Read) => {
                let list_key = DataKey::UserTokenList(user.clone());
                let token_hashes: Vec<BytesN<32>> = env
                    .storage()
                    .persistent()
                    .get(&list_key)
                    .unwrap_or(Vec::new(&env));

                let current_time = env.ledger().timestamp();
                let mut results: Vec<TokenMetadata> = Vec::new(&env);

                for hash in token_hashes.iter() {
                    let token_key = DataKey::TokenData(user.clone(), hash.clone());
                    if let Some(mut token) = env.storage().persistent().get::<DataKey, TokenMetadata>(&token_key) {
                        // Auto-update expired tokens
                        if current_time > token.expires_at && token.status != String::from_str(&env, "expired") {
                            token.status = String::from_str(&env, "expired");
                            env.storage().persistent().set(&token_key, &token);
                        }
                        results.push_back(token);
                    }
                }

                // Emit access event
                env.events().publish(
                    (symbol_short!("access"), user),
                    current_time
                );

                results
            },
            _ => Vec::new(&env)
        }
    }

    /// Revoke a specific card token by hash
    pub fn revoke_token(env: Env, user: Address, token_hash: BytesN<32>) -> bool {
        user.require_auth();

        let token_key = DataKey::TokenData(user.clone(), token_hash.clone());
        let metadata: Option<TokenMetadata> = env.storage().persistent().get(&token_key);
        
        if let Some(mut token) = metadata {
            token.status = String::from_str(&env, "revoked");
            env.storage().persistent().set(&token_key, &token);

            // Remove from user's token list
            let list_key = DataKey::UserTokenList(user.clone());
            if let Some(token_list) = env.storage().persistent().get::<DataKey, Vec<BytesN<32>>>(&list_key) {
                let mut new_list: Vec<BytesN<32>> = Vec::new(&env);
                for h in token_list.iter() {
                    if h != token_hash {
                        new_list.push_back(h);
                    }
                }
                env.storage().persistent().set(&list_key, &new_list);
            }

            // Decrement global token count
            let mut count: u32 = env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0);
            if count > 0 {
                count -= 1;
            }
            env.storage().instance().set(&DataKey::TokenCount, &count);
            
            // Emit revocation event
            env.events().publish(
                (symbol_short!("revoke"), user),
                env.ledger().timestamp()
            );
            
            true
        } else {
            false
        }
    }

    /// Update token permissions (owner only)
    pub fn update_permissions(env: Env, user: Address, permission: Permission) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        
        env.storage().persistent().set(&DataKey::Permissions(user.clone()), &permission);
        
        env.events().publish(
            (symbol_short!("perm"), user),
            env.ledger().timestamp()
        );
    }

    /// Get global token count
    pub fn get_token_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0)
    }

    /// Get the number of cards stored by a specific user
    pub fn get_user_token_count(env: Env, user: Address) -> u32 {
        let list_key = DataKey::UserTokenList(user);
        let token_list: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));
        token_list.len()
    }

    /// Get a specific token's status (public - doesn't reveal encrypted data)
    pub fn get_token_status(env: Env, user: Address, token_hash: BytesN<32>) -> Option<String> {
        let token_key = DataKey::TokenData(user, token_hash);
        let metadata: Option<TokenMetadata> = env.storage().persistent().get(&token_key);
        metadata.map(|m| m.status)
    }

    /// Emergency pause (owner only)
    pub fn pause(env: Env) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        
        env.storage().instance().set(&symbol_short!("paused"), &true);
        
        env.events().publish(
            (symbol_short!("pause"), owner),
            env.ledger().timestamp()
        );
    }

    /// Unpause (owner only)
    pub fn unpause(env: Env) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        
        env.storage().instance().set(&symbol_short!("paused"), &false);
        
        env.events().publish(
            (symbol_short!("unpause"), owner),
            env.ledger().timestamp()
        );
    }

    /// Check if contract is paused
    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&symbol_short!("paused")).unwrap_or(false)
    }
}

#[cfg(test)]
mod test;
