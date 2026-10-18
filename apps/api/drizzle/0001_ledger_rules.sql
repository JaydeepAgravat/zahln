-- Ledger rules enforced by the database itself, so no bug in app code can break them.

-- 1. Every ledger transaction must balance: its postings sum to zero.
--    A deferred constraint trigger checks at COMMIT, after all postings of the transaction are inserted.
CREATE OR REPLACE FUNCTION assert_ledger_transaction_balanced() RETURNS trigger AS $$
DECLARE
  total bigint;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO total FROM postings WHERE transaction_id = NEW.transaction_id;
  IF total <> 0 THEN
    RAISE EXCEPTION 'ledger transaction % is unbalanced (sum = %)', NEW.transaction_id, total
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER postings_balanced
  AFTER INSERT ON postings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_ledger_transaction_balanced();
--> statement-breakpoint

-- 2. Postings are append-only: history is never edited. Corrections are new transactions (e.g. refunds).
CREATE OR REPLACE FUNCTION reject_posting_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'postings are append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER postings_append_only
  BEFORE UPDATE OR DELETE ON postings
  FOR EACH ROW EXECUTE FUNCTION reject_posting_change();
--> statement-breakpoint

-- 3. Wallets that may not go negative are checked at commit too (defence in depth behind the row lock).
CREATE OR REPLACE FUNCTION assert_account_not_negative() RETURNS trigger AS $$
DECLARE
  may_go_negative boolean;
  balance bigint;
BEGIN
  SELECT allow_negative INTO may_go_negative FROM accounts WHERE id = NEW.account_id;
  IF NOT may_go_negative THEN
    SELECT COALESCE(SUM(amount_cents), 0) INTO balance FROM postings WHERE account_id = NEW.account_id;
    IF balance < 0 THEN
      RAISE EXCEPTION 'account % would go negative (%)', NEW.account_id, balance
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER postings_no_negative_wallets
  AFTER INSERT ON postings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_account_not_negative();
