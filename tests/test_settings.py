import pytest
from src.settings import database_options, configuration


def test_shared_stock_configuration():
    cfg = configuration()
    assert len(cfg['stocks']) == 5
    assert len({s['symbol'] for s in cfg['stocks']}) == 5


def test_neon_connection_uses_tls(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example:placeholder@test.neon.tech/neondb?sslmode=require')
    assert database_options()['conninfo'].endswith('sslmode=require')


def test_remote_plaintext_connection_rejected(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example:placeholder@test.neon.tech/neondb')
    with pytest.raises(ValueError, match='TLS'):
        database_options()


def test_pooler_rejected_for_session_lock(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example:placeholder@test-pooler.neon.tech/neondb?sslmode=require')
    with pytest.raises(ValueError, match='direct Neon'):
        database_options()
