---
pack: solana
confidence: 8/10
sources_checked: 10
last_updated: "2026-02-16"
---

# How do I implement on-chain reputation and non-transferable tokens?

On-chain reputation systems and soulbound (non-transferable) tokens enable verifiable credentials, achievements, and identity without the ability to buy or sell them. Solana's Token-2022 Non-Transferable extension makes this pattern native and efficient.

## What Are Soulbound Tokens?

A **Soulbound Token (SBT)** is a non-transferable crypto asset designed to represent reputation, credentials, or identity in a decentralized context. Unlike typical cryptocurrency assets aimed at trading or investment, SBTs cannot be sold or transferred after issuance.

### Key Characteristics

- **Non-transferable**: Cannot be sent to another wallet after minting
- **Identity-bound**: Permanently associated with the original recipient
- **Verifiable**: Public proof of achievements, credentials, or affiliations
- **Composable**: Multiple SBTs build a verifiable on-chain resume

### The Vision (Vitalik Buterin's Paper)

SBTs represent "commitments, credentials, and affiliations" that encode **trust networks** from the real economy to establish **provenance and reputation**. By collecting SBTs, users build a **verifiable digital resume** based on **merit rather than wealth**.

## Solana's Non-Transferable Extension

Solana implements soulbound tokens natively through Token-2022's **Non-Transferable** extension.

### Technical Implementation

```bash
# Create a non-transferable token mint
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-non-transferable
```

### How It Works

The `InitializeNonTransferableMint` extension prevents tokens from being transferred between token accounts after minting:

```rust
// Token behavior:
✅ Mint tokens to accounts
✅ Burn tokens from accounts
✅ Close empty token accounts (balance = 0)
❌ Transfer between accounts (permanently disabled)
```

**Important**: Token account owners can still **burn** their tokens and **close** the account when balance reaches zero.

### Basic Implementation

```rust
use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022, MintTo};

#[program]
pub mod soulbound_credentials {
    use super::*;

    pub fn initialize_credential_mint(
        ctx: Context<InitializeCredentialMint>,
    ) -> Result<()> {
        msg!("Initializing non-transferable credential mint");
        // Token-2022 with NonTransferable extension is already configured
        // via the spl-token CLI or during account creation

        Ok(())
    }

    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_type: CredentialType,
    ) -> Result<()> {
        // Verify issuer authority
        require!(
            ctx.accounts.issuer.key() == CREDENTIAL_AUTHORITY,
            ErrorCode::Unauthorized
        );

        // Mint 1 non-transferable token to recipient
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.credential_mint.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
        );

        token_2022::mint_to(cpi_context, 1)?;

        emit!(CredentialIssued {
            recipient: ctx.accounts.recipient.key(),
            credential_type,
            issued_at: Clock::get()?.unix_timestamp,
            issuer: ctx.accounts.issuer.key(),
        });

        msg!("Credential issued to {}", ctx.accounts.recipient.key());

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CredentialType {
    UniversityDegree,
    BootcampCompletion,
    ProfessionalCertification,
    CommunityContribution,
    GameAchievement,
}

#[event]
pub struct CredentialIssued {
    pub recipient: Pubkey,
    pub credential_type: CredentialType,
    pub issued_at: i64,
    pub issuer: Pubkey,
}
```

## Use Cases for Soulbound Tokens

### 1. Educational Credentials

Universities, bootcamps, and professional organizations can issue SBTs to attest to course completion, degrees, or certifications.

```rust
#[account]
pub struct EducationCredential {
    pub holder: Pubkey,
    pub institution: Pubkey,
    pub degree_type: String, // "Bachelor of Science", "MBA", "PhD"
    pub major: String,       // "Computer Science", "Economics"
    pub graduation_date: i64,
    pub gpa: Option<u16>,    // e.g., 385 = 3.85 GPA
    pub honors: Option<String>, // "Summa Cum Laude", "With Distinction"
}

pub fn issue_degree(
    ctx: Context<IssueDegree>,
    degree_type: String,
    major: String,
    gpa: Option<u16>,
) -> Result<()> {
    let credential = &mut ctx.accounts.credential;

    // Verify issuer is authorized university
    require!(
        ctx.accounts.university.key() == UNIVERSITY_AUTHORITY,
        ErrorCode::UnauthorizedIssuer
    );

    credential.holder = ctx.accounts.student.key();
    credential.institution = ctx.accounts.university.key();
    credential.degree_type = degree_type;
    credential.major = major;
    credential.graduation_date = Clock::get()?.unix_timestamp;
    credential.gpa = gpa;

    // Mint non-transferable degree token
    mint_soulbound_token(ctx)?;

    Ok(())
}
```

**Verification**: Third-party employers or dApps can verify these on-chain without relying on centralized registries.

### 2. Professional Certifications

```rust
#[account]
pub struct ProfessionalCertification {
    pub holder: Pubkey,
    pub certification_body: Pubkey,
    pub certification_name: String, // "AWS Solutions Architect", "CPA"
    pub issue_date: i64,
    pub expiry_date: Option<i64>,   // Some certs expire
    pub credential_id: String,      // Reference to off-chain verification
}

pub fn verify_certification(
    ctx: Context<VerifyCertification>,
) -> Result<bool> {
    let cert = &ctx.accounts.certification;

    // Check if certification is still valid
    if let Some(expiry) = cert.expiry_date {
        let current_time = Clock::get()?.unix_timestamp;
        if current_time > expiry {
            return Ok(false); // Expired
        }
    }

    // Verify issuer is legitimate certification body
    let is_valid = TRUSTED_CERTIFICATION_BODIES.contains(&cert.certification_body);

    Ok(is_valid)
}
```

### 3. Game Achievements and Badges

Gaming industry applications use non-transferable tokens for achievements or badges that players cannot trade, increasing their value and prestige.

```rust
#[account]
pub struct GameAchievement {
    pub player: Pubkey,
    pub game_id: Pubkey,
    pub achievement_name: String,
    pub rarity: AchievementRarity,
    pub earned_at: i64,
    pub stats_snapshot: AchievementStats, // Stats when achieved
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum AchievementRarity {
    Common,
    Rare,
    Epic,
    Legendary,
}

pub fn unlock_achievement(
    ctx: Context<UnlockAchievement>,
    achievement_name: String,
    rarity: AchievementRarity,
) -> Result<()> {
    let achievement = &mut ctx.accounts.achievement;

    // Verify game server authority
    require!(
        ctx.accounts.game_server.key() == GAME_AUTHORITY,
        ErrorCode::UnauthorizedGameServer
    );

    achievement.player = ctx.accounts.player.key();
    achievement.game_id = ctx.accounts.game.key();
    achievement.achievement_name = achievement_name.clone();
    achievement.rarity = rarity;
    achievement.earned_at = Clock::get()?.unix_timestamp;

    // Mint soulbound achievement token
    mint_soulbound_token(ctx)?;

    emit!(AchievementUnlocked {
        player: ctx.accounts.player.key(),
        achievement: achievement_name,
        rarity_level: achievement.rarity.clone(),
    });

    Ok(())
}
```

### 4. DAO Participation and Governance Reputation

Track meaningful contribution and participation in DAOs.

```rust
#[account]
pub struct DAOReputation {
    pub member: Pubkey,
    pub dao: Pubkey,
    pub proposals_created: u32,
    pub proposals_voted: u32,
    pub total_voting_power: u64,
    pub joined_at: i64,
    pub badges: Vec<ReputationBadge>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ReputationBadge {
    EarlyMember,        // Joined in first 100 members
    ActiveVoter,        // Voted on 50+ proposals
    ProposalCreator,    // Created 10+ proposals
    TreasuryContributor, // Donated to treasury
}

pub fn award_reputation_badge(
    ctx: Context<AwardBadge>,
    badge_type: ReputationBadge,
) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;

    // Verify badge criteria
    match badge_type {
        ReputationBadge::ActiveVoter => {
            require!(
                reputation.proposals_voted >= 50,
                ErrorCode::CriteriaNotMet
            );
        }
        ReputationBadge::ProposalCreator => {
            require!(
                reputation.proposals_created >= 10,
                ErrorCode::CriteriaNotMet
            );
        }
        _ => {}
    }

    // Ensure no duplicate badges
    require!(
        !reputation.badges.contains(&badge_type),
        ErrorCode::BadgeAlreadyAwarded
    );

    reputation.badges.push(badge_type.clone());

    // Mint soulbound badge token
    mint_soulbound_badge(ctx, badge_type)?;

    Ok(())
}
```

### 5. Community Contributions and Social Reputation

```rust
#[account]
pub struct CommunityReputation {
    pub member: Pubkey,
    pub community: Pubkey,
    pub contributions: Vec<Contribution>,
    pub reputation_score: u64,
    pub trust_rating: u16, // 0-1000
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Contribution {
    pub contribution_type: ContributionType,
    pub timestamp: i64,
    pub impact_score: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ContributionType {
    CodeContribution,
    Documentation,
    CommunitySupport,
    BugReport,
    ContentCreation,
}

pub fn record_contribution(
    ctx: Context<RecordContribution>,
    contribution_type: ContributionType,
    impact_score: u32,
) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;

    let contribution = Contribution {
        contribution_type,
        timestamp: Clock::get()?.unix_timestamp,
        impact_score,
    };

    reputation.contributions.push(contribution);
    reputation.reputation_score += impact_score as u64;

    // Award milestone badges
    if reputation.contributions.len() == 10 {
        mint_milestone_badge(ctx, "10 Contributions")?;
    }

    Ok(())
}
```

## Reputation Scoring Systems

### Weighted Reputation Calculation

```rust
pub fn calculate_reputation_score(ctx: Context<CalculateReputation>) -> Result<u64> {
    let user = &ctx.accounts.user_reputation;

    let mut total_score: u64 = 0;

    // Weight different credential types
    total_score += user.university_degrees.len() as u64 * 1000;
    total_score += user.certifications.len() as u64 * 500;
    total_score += user.dao_participation_score * 2;
    total_score += user.community_contributions * 10;
    total_score += user.game_achievements.len() as u64 * 50;

    // Time decay for older achievements (keep recent activity relevant)
    let current_time = Clock::get()?.unix_timestamp;
    let account_age_years = (current_time - user.created_at) / (365 * 24 * 60 * 60);

    // Boost for sustained long-term participation
    total_score += account_age_years as u64 * 100;

    msg!("Reputation score for {}: {}", ctx.accounts.user.key(), total_score);

    Ok(total_score)
}
```

### Reputation Verification for Access Control

```rust
pub fn verify_reputation_threshold(
    ctx: Context<VerifyReputation>,
    minimum_score: u64,
) -> Result<()> {
    let user_score = calculate_reputation_score(ctx)?;

    require!(
        user_score >= minimum_score,
        ErrorCode::InsufficientReputation
    );

    msg!("User {} has sufficient reputation: {}",
         ctx.accounts.user.key(),
         user_score
    );

    Ok(())
}

// Example: Reputation-gated content access
pub fn access_premium_content(ctx: Context<AccessContent>) -> Result<()> {
    // Require 5000+ reputation score
    verify_reputation_threshold(ctx, 5000)?;

    // Grant access
    msg!("Access granted to premium content");

    Ok(())
}
```

## Skill Verification and Professional Profiles

### On-Chain Professional Resume

```rust
#[account]
pub struct ProfessionalProfile {
    pub owner: Pubkey,
    pub education: Vec<Pubkey>,         // References to education credentials
    pub certifications: Vec<Pubkey>,    // References to certifications
    pub work_history: Vec<WorkExperience>,
    pub skills: Vec<Skill>,
    pub endorsements: Vec<Endorsement>,
    pub reputation_score: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WorkExperience {
    pub employer: Option<Pubkey>, // On-chain employer verification
    pub title: String,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub description: String,
    pub verified: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Skill {
    pub name: String,
    pub proficiency: SkillLevel,
    pub endorsements_count: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum SkillLevel {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Endorsement {
    pub endorser: Pubkey,
    pub skill: String,
    pub timestamp: i64,
    pub message: Option<String>,
}

pub fn endorse_skill(
    ctx: Context<EndorseSkill>,
    skill_name: String,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    // Find the skill
    let skill = profile.skills.iter_mut()
        .find(|s| s.name == skill_name)
        .ok_or(ErrorCode::SkillNotFound)?;

    skill.endorsements_count += 1;

    // Record endorsement
    let endorsement = Endorsement {
        endorser: ctx.accounts.endorser.key(),
        skill: skill_name,
        timestamp: Clock::get()?.unix_timestamp,
        message: None,
    };

    profile.endorsements.push(endorsement);

    Ok(())
}
```

## On-Chain Identity Verification

### Pattern: Credential Aggregation

```rust
pub fn verify_identity(ctx: Context<VerifyIdentity>) -> Result<IdentityVerificationResult> {
    let profile = &ctx.accounts.profile;

    let mut verification = IdentityVerificationResult {
        has_education: false,
        has_certification: false,
        has_dao_participation: false,
        has_community_contributions: false,
        verification_level: VerificationLevel::Unverified,
    };

    // Check education credentials
    if !profile.education.is_empty() {
        verification.has_education = true;
    }

    // Check professional certifications
    if !profile.certifications.is_empty() {
        verification.has_certification = true;
    }

    // Check DAO participation
    if profile.reputation_score >= 1000 {
        verification.has_dao_participation = true;
    }

    // Determine overall verification level
    let credential_count = [
        verification.has_education,
        verification.has_certification,
        verification.has_dao_participation,
    ].iter().filter(|&&x| x).count();

    verification.verification_level = match credential_count {
        0 => VerificationLevel::Unverified,
        1 => VerificationLevel::Basic,
        2 => VerificationLevel::Verified,
        _ => VerificationLevel::HighlyVerified,
    };

    Ok(verification)
}
```

## Preventing Sybil Attacks

Soulbound tokens help prevent **Sybil attacks** (one person creating many fake identities) because credentials are bound to wallets with real-world proof.

### Strategies

1. **Proof of Humanity**: Link SBTs to verified identity services
2. **Cost Barriers**: Require payment or staking to issue credentials
3. **Social Graphs**: Trusted issuers with reputation at stake
4. **Time Locks**: Credentials take time to earn (can't be instantly farmed)

```rust
pub fn issue_verified_credential(
    ctx: Context<IssueVerified>,
) -> Result<()> {
    let issuer = &ctx.accounts.issuer;

    // Ensure issuer has high reputation
    require!(
        issuer.reputation_score >= 10_000,
        ErrorCode::IssuerNotTrusted
    );

    // Ensure issuer has history (account age > 6 months)
    let account_age = Clock::get()?.unix_timestamp - issuer.created_at;
    require!(
        account_age > 6 * 30 * 24 * 60 * 60, // 6 months
        ErrorCode::IssuerTooNew
    );

    // Issue the credential
    mint_soulbound_credential(ctx)?;

    Ok(())
}
```

## Privacy Considerations

SBTs are **public by default** on Solana. For sensitive credentials:

### Pattern: Zero-Knowledge Proofs

```rust
// Store credential proof on-chain, not the data itself
#[account]
pub struct PrivateCredential {
    pub holder: Pubkey,
    pub credential_hash: [u8; 32],  // Hash of actual credential
    pub issuer: Pubkey,
    pub issued_at: i64,
    pub credential_type: u8,        // Type code, not details
}

// User can prove they have credential without revealing details
pub fn verify_credential_ownership(
    ctx: Context<VerifyPrivate>,
    proof: Vec<u8>,
) -> Result<bool> {
    // Use ZK proof to verify ownership without exposing data
    let is_valid = verify_zk_proof(&proof, &ctx.accounts.credential.credential_hash)?;

    Ok(is_valid)
}
```

## Real-World Implementations

### Ledger Flex Solana Edition SBT

**Ledger** has issued soulbound tokens for its Solana Edition hardware wallet, demonstrating enterprise adoption of the SBT model on Solana.

### DeFi Reputation Systems

Projects are exploring reputation-based lending where users with higher SBT reputation get better loan terms:

```rust
pub fn calculate_loan_terms(ctx: Context<CalculateLoan>) -> Result<LoanTerms> {
    let reputation_score = calculate_reputation_score(ctx)?;

    // Better terms for higher reputation
    let interest_rate = match reputation_score {
        0..=1000 => 1200,      // 12% APR
        1001..=5000 => 800,    // 8% APR
        5001..=10000 => 500,   // 5% APR
        _ => 300,              // 3% APR (highly reputable)
    };

    let max_loan_amount = reputation_score * 10; // $10 per reputation point

    Ok(LoanTerms {
        interest_rate,
        max_loan_amount,
        collateral_requirement: 120, // 120% collateral
    })
}
```

## Best Practices

1. **Trusted Issuers Only**: Only allow verified organizations to issue credentials
2. **Immutable Records**: SBTs should never be editable (only revocable)
3. **Revocation Mechanism**: Build in ability to revoke fraudulent credentials
4. **Metadata Standards**: Use consistent schema for interoperability
5. **Privacy Options**: Consider ZK proofs for sensitive credentials
6. **Expiry Dates**: Some credentials should expire (certifications, licenses)
7. **Off-Chain Storage**: Store detailed data on Arweave/IPFS, hash on-chain

## Revocation Pattern

While SBTs can't be transferred, they may need to be revoked (degree fraud, expired cert):

```rust
pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
    let credential = &mut ctx.accounts.credential;

    // Only issuer can revoke
    require!(
        ctx.accounts.issuer.key() == credential.issuer,
        ErrorCode::Unauthorized
    );

    credential.revoked = true;
    credential.revoked_at = Some(Clock::get()?.unix_timestamp);
    credential.revocation_reason = Some("Fraudulent credential".to_string());

    // Burn the soulbound token
    burn_soulbound_token(ctx)?;

    emit!(CredentialRevoked {
        holder: credential.holder,
        issuer: credential.issuer,
        reason: "Fraudulent credential".to_string(),
    });

    Ok(())
}
```

## Resources

- **Token-2022 Non-Transferable Guide**: https://solana.com/developers/guides/token-extensions/non-transferable
- **Non-Transferable Token Course**: https://solana.com/developers/courses/token-extensions/non-transferable-token
- **Example Implementation**: https://github.com/solana-developers/program-examples/tree/main/tokens/token-2022/non-transferable
- **Vitalik's SBT Paper**: "Decentralized Society: Finding Web3's Soul"

## Sources

Research for this document included:
- [What is Soulbound Token (SBT)?](https://www.cube.exchange/what-is/soulbound-token)
- [Non-Transferrable Tokens (Solana Docs)](https://solana.com/docs/tokens/extensions/non-transferrable-tokens)
- [What is a SoulBound Token? (Ledger)](https://www.ledger.com/academy/topics/blockchain/what-is-a-soulbound-token)
- [Non-Transferable Token Course](https://solana.com/developers/courses/token-extensions/non-transferable-token)
- [Soulbound Tokens Explained (OpenSea)](https://learn.opensea.io/learn/nft/what-are-soulbound-tokens)
- [What Are Soulbound Tokens (CoinGecko)](https://www.coingecko.com/learn/soulbound-tokens-sbt)
- [Non-transferable Extension Guide](https://solana.com/developers/guides/token-extensions/non-transferable)
- [Token-2022 Specification (RareSkills)](https://rareskills.io/post/token-2022)
- [Token Extensions (Solana)](https://solana.com/solutions/token-extensions)
