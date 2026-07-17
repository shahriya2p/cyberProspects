import re

from pipeline import signals


def test_signal_bits_are_unique():
    tx = signals.load()
    bits = [s.bit for s in tx.signals]
    assert len(set(bits)) == len(bits)


def test_masks_pack_without_overlap():
    tx = signals.load()
    combined = 0
    for s in tx.signals:
        assert combined & s.mask == 0
        combined |= s.mask


def test_tokens_match_whole_components_only():
    tx = signals.load()
    email = re.compile(tx.by_key("email").regex)
    # real mail hosts, including numbered variants
    assert email.search("autodiscover")
    assert email.search("mail1")
    assert email.search("smtp.acme.co.za")
    # should not fire on words that merely contain a token
    assert not email.search("mailchimp")
    assert not email.search("www")


def test_hyphen_delimited_components_match():
    tx = signals.load()
    nonprod = re.compile(tx.by_key("nonprod").regex)
    assert nonprod.search("api-dev")
    assert nonprod.search("dev")
    assert not nonprod.search("development")  # dev is not a full component here


def test_devops_and_remote_access_are_high_weight():
    tx = signals.load()
    # the risky surfaces should outweigh ubiquitous email/hosting in the score
    assert tx.by_key("remote_access").weight > tx.by_key("email").weight
    assert tx.by_key("devops").weight > tx.by_key("hosting_panel").weight
