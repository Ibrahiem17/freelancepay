use {
    borsh::BorshDeserialize,
    freelancepay::{EscrowAccount, EscrowStatus},
    litesvm::LiteSVM,
    sha2::{Digest, Sha256},
    solana_address::Address,
    solana_instruction::{account_meta::AccountMeta, Instruction},
    solana_keypair::Keypair,
    solana_message::Message,
    solana_signer::Signer,
    solana_transaction::Transaction,
    std::path::PathBuf,
};

// ── Constants ────────────────────────────────────────────────────────────────

const SOL: u64 = 1_000_000_000;

fn program_id() -> Address {
    "5Xw3NMeBryNtdb2Hpg6pU1HqkpT9ymx6aScstd1T8NTX".parse().unwrap()
}

fn system_program() -> Address {
    "11111111111111111111111111111111".parse().unwrap()
}

fn so_path() -> PathBuf {
    // CARGO_MANIFEST_DIR = programs/freelancepay/
    // .so lives at workspace_root/target/deploy/
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.push("../../target/deploy/freelancepay.so");
    p
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn ix_discriminator(name: &str) -> [u8; 8] {
    let hash = Sha256::digest(format!("global:{}", name).as_bytes());
    hash[..8].try_into().unwrap()
}

fn find_escrow_pda(client: &Address) -> (Address, u8) {
    Address::find_program_address(&[b"escrow", client.as_ref()], &program_id())
}

fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program_from_file(program_id(), so_path())
        .expect("failed to load freelancepay.so — run cargo build first");
    svm
}

fn parse_escrow(svm: &LiteSVM, pda: &Address) -> EscrowAccount {
    let account = svm.get_account(pda).expect("escrow account not found");
    // skip 8-byte Anchor discriminator, then borsh-deserialize
    EscrowAccount::deserialize(&mut &account.data[8..]).expect("failed to deserialize EscrowAccount")
}

// Instruction data builders (Anchor format: 8-byte discriminator + borsh args)

fn create_escrow_data(title: &str, description: &str, freelancer: &Address, amount: u64) -> Vec<u8> {
    let mut d = ix_discriminator("create_escrow").to_vec();
    d.extend_from_slice(&(title.len() as u32).to_le_bytes());
    d.extend_from_slice(title.as_bytes());
    d.extend_from_slice(&(description.len() as u32).to_le_bytes());
    d.extend_from_slice(description.as_bytes());
    d.extend_from_slice(freelancer.as_ref()); // Pubkey = 32 raw bytes
    d.extend_from_slice(&amount.to_le_bytes());
    d
}

fn submit_work_data(note: &str) -> Vec<u8> {
    let mut d = ix_discriminator("submit_work").to_vec();
    d.extend_from_slice(&(note.len() as u32).to_le_bytes());
    d.extend_from_slice(note.as_bytes());
    d
}

fn approve_work_data() -> Vec<u8> { ix_discriminator("approve_work").to_vec() }
fn cancel_escrow_data() -> Vec<u8> { ix_discriminator("cancel_escrow").to_vec() }

fn send(svm: &mut LiteSVM, ix: Instruction, signers: &[&Keypair]) {
    let payer = signers[0].pubkey();
    let blockhash = svm.latest_blockhash();
    let msg = Message::new(&[ix], Some(&payer));
    let tx = Transaction::new(signers, msg, blockhash);
    let meta = svm.send_transaction(tx).unwrap();
    // print logs so we can see what happened
    for log in &meta.logs { println!("  {}", log); }
}

fn try_send(svm: &mut LiteSVM, ix: Instruction, signers: &[&Keypair]) -> bool {
    let payer = signers[0].pubkey();
    let blockhash = svm.latest_blockhash();
    let msg = Message::new(&[ix], Some(&payer));
    let tx = Transaction::new(signers, msg, blockhash);
    match svm.send_transaction(tx) {
        Ok(_) => true,
        Err(e) => {
            println!("  Expected failure logs:");
            for log in &e.meta.logs { println!("    {}", log); }
            false
        }
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[test]
fn test_1_create_escrow() {
    println!("\n── Test 1: Creates an escrow ──────────────────────────");
    let mut svm = setup();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    svm.airdrop(&client.pubkey(), 2 * SOL).unwrap();

    let (escrow_pda, _) = find_escrow_pda(&client.pubkey());
    let amount = SOL / 10; // 0.1 SOL

    let ix = Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
            AccountMeta::new_readonly(system_program(), false),
        ],
        data: create_escrow_data("Build my website", "A full-stack website", &freelancer.pubkey(), amount),
    };

    send(&mut svm, ix, &[&client]);

    let escrow = parse_escrow(&svm, &escrow_pda);
    let account_lamports = svm.get_account(&escrow_pda).unwrap().lamports;

    println!("  PDA: {}", escrow_pda);
    println!("  Status: {:?}", escrow.status);
    println!("  Amount locked: {} lamports ({} SOL)", account_lamports, account_lamports as f64 / SOL as f64);
    println!("  Title: {}", escrow.title);

    assert_eq!(escrow.status, EscrowStatus::Active);
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.title, "Build my website");
    assert!(account_lamports >= amount, "PDA must hold at least the deposited amount");

    println!("  ✅ PASSED");
}

#[test]
fn test_2_submit_work() {
    println!("\n── Test 2: Freelancer submits work ────────────────────");
    let mut svm = setup();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    svm.airdrop(&client.pubkey(), 2 * SOL).unwrap();
    svm.airdrop(&freelancer.pubkey(), SOL / 10).unwrap();

    let (escrow_pda, _) = find_escrow_pda(&client.pubkey());
    let amount = SOL / 10;

    // Create escrow first
    let create_ix = Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
            AccountMeta::new_readonly(system_program(), false),
        ],
        data: create_escrow_data("Build my website", "A full-stack website", &freelancer.pubkey(), amount),
    };
    send(&mut svm, create_ix, &[&client]);

    // Submit work
    let submit_ix = Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(freelancer.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
        ],
        data: submit_work_data("Website delivered at mysite.com"),
    };
    send(&mut svm, submit_ix, &[&freelancer]);

    let escrow = parse_escrow(&svm, &escrow_pda);
    println!("  Status: {:?}", escrow.status);
    println!("  Work submission: {}", escrow.work_submission);

    assert_eq!(escrow.status, EscrowStatus::Submitted);
    assert_eq!(escrow.work_submission, "Website delivered at mysite.com");

    println!("  ✅ PASSED");
}

#[test]
fn test_3_approve_work() {
    println!("\n── Test 3: Client approves, SOL released ──────────────");
    let mut svm = setup();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    svm.airdrop(&client.pubkey(), 2 * SOL).unwrap();
    svm.airdrop(&freelancer.pubkey(), SOL / 10).unwrap(); // cover fees

    let (escrow_pda, _) = find_escrow_pda(&client.pubkey());
    let amount = SOL / 10;

    // Create
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
            AccountMeta::new_readonly(system_program(), false),
        ],
        data: create_escrow_data("Build my website", "Description", &freelancer.pubkey(), amount),
    }, &[&client]);

    // Submit
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(freelancer.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
        ],
        data: submit_work_data("Website delivered at mysite.com"),
    }, &[&freelancer]);

    let freelancer_before = svm.get_balance(&freelancer.pubkey()).unwrap_or(0);

    // Approve
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(freelancer.pubkey(), false),
            AccountMeta::new(escrow_pda, false),
        ],
        data: approve_work_data(),
    }, &[&client]);

    let freelancer_after = svm.get_balance(&freelancer.pubkey()).unwrap_or(0);
    let escrow_closed = svm.get_account(&escrow_pda).is_none()
        || svm.get_account(&escrow_pda).map(|a| a.lamports).unwrap_or(0) == 0;

    println!("  Freelancer before: {} lamports", freelancer_before);
    println!("  Freelancer after:  {} lamports", freelancer_after);
    println!("  SOL received:      {} lamports", freelancer_after.saturating_sub(freelancer_before));
    println!("  Escrow closed/empty: {}", escrow_closed);

    assert!(freelancer_after > freelancer_before, "Freelancer should have received SOL");
    assert!(
        freelancer_after - freelancer_before >= amount,
        "Freelancer should receive at least the deposited amount"
    );
    assert!(escrow_closed, "Escrow account should be closed after approval");

    println!("  ✅ PASSED");
}

#[test]
fn test_4_cancel_escrow() {
    println!("\n── Test 4: Client cancels, SOL refunded ───────────────");
    let mut svm = setup();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    svm.airdrop(&client.pubkey(), 2 * SOL).unwrap();

    let (escrow_pda, _) = find_escrow_pda(&client.pubkey());
    let amount = SOL / 10;

    let client_before = svm.get_balance(&client.pubkey()).unwrap();

    // Create
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
            AccountMeta::new_readonly(system_program(), false),
        ],
        data: create_escrow_data("Build my website", "Description", &freelancer.pubkey(), amount),
    }, &[&client]);

    let client_after_create = svm.get_balance(&client.pubkey()).unwrap();
    println!("  Client before create: {} lamports", client_before);
    println!("  Client after create:  {} lamports (locked {} SOL)", client_after_create, amount as f64 / SOL as f64);

    // Cancel
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
        ],
        data: cancel_escrow_data(),
    }, &[&client]);

    let client_after_cancel = svm.get_balance(&client.pubkey()).unwrap();
    println!("  Client after cancel:  {} lamports", client_after_cancel);

    // After cancel, client should be close to original balance (minus tx fees ~5000 lamports each)
    assert!(
        client_after_cancel > client_after_create,
        "Client should get SOL back after cancel"
    );
    let recovered = client_after_cancel - client_after_create;
    println!("  Recovered: {} lamports", recovered);
    assert!(recovered >= amount, "Client should recover at least the deposited amount");

    println!("  ✅ PASSED");
}

#[test]
fn test_5_wrong_signer_cannot_approve() {
    println!("\n── Test 5: Wrong signer rejected (NotClient) ──────────");
    let mut svm = setup();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    let stranger = Keypair::new();
    svm.airdrop(&client.pubkey(), 2 * SOL).unwrap();
    svm.airdrop(&freelancer.pubkey(), SOL / 10).unwrap(); // needs SOL to pay submit_work tx fee
    svm.airdrop(&stranger.pubkey(), SOL / 10).unwrap();

    let (escrow_pda, _) = find_escrow_pda(&client.pubkey());
    let amount = SOL / 10;

    // Create and submit
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
            AccountMeta::new_readonly(system_program(), false),
        ],
        data: create_escrow_data("Build my website", "Description", &freelancer.pubkey(), amount),
    }, &[&client]);

    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(freelancer.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
        ],
        data: submit_work_data("Work done"),
    }, &[&freelancer]);

    // Stranger tries to approve — seeds won't match since escrow was created for client
    let approved = try_send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(stranger.pubkey(), true),  // wrong signer
            AccountMeta::new(freelancer.pubkey(), false),
            AccountMeta::new(escrow_pda, false),
        ],
        data: approve_work_data(),
    }, &[&stranger]);

    assert!(!approved, "Stranger must not be able to approve the escrow");
    println!("  ✅ PASSED — transaction correctly rejected");
}

#[test]
fn test_6_cannot_approve_when_active() {
    println!("\n── Test 6: Approve before submission rejected (InvalidStatus)");
    let mut svm = setup();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    svm.airdrop(&client.pubkey(), 2 * SOL).unwrap();

    let (escrow_pda, _) = find_escrow_pda(&client.pubkey());
    let amount = SOL / 10;

    // Create (status = Active, NOT Submitted)
    send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(escrow_pda, false),
            AccountMeta::new_readonly(system_program(), false),
        ],
        data: create_escrow_data("Build my website", "Description", &freelancer.pubkey(), amount),
    }, &[&client]);

    // Try to approve immediately (status is Active, not Submitted)
    let approved = try_send(&mut svm, Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(client.pubkey(), true),
            AccountMeta::new(freelancer.pubkey(), false),
            AccountMeta::new(escrow_pda, false),
        ],
        data: approve_work_data(),
    }, &[&client]);

    assert!(!approved, "Approve on Active escrow must be rejected (InvalidStatus)");
    println!("  ✅ PASSED — InvalidStatus correctly enforced");
}
