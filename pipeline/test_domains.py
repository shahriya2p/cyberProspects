from pipeline import domains


def registrable(ex, host: str) -> str | None:
    e = ex(host)
    return f"{e.domain}.{e.suffix}" if e.suffix and e.domain else None


def test_multipart_cctlds_group_correctly():
    # The whole point of the PSL step: these must land on the company, not on
    # the public suffix. A naive "last two labels" split gets every one wrong.
    ex = domains.build_extractor()
    assert registrable(ex, "autodiscover.tmmfeka.co.za") == "tmmfeka.co.za"
    assert registrable(ex, "cpcontacts.babs.com.ng") == "babs.com.ng"
    assert registrable(ex, "www.naturesecretsafaris.co.ke") == "naturesecretsafaris.co.ke"


def test_plain_gtld_and_deep_subdomain():
    ex = domains.build_extractor()
    assert registrable(ex, "webdisk.mfcairservices.com") == "mfcairservices.com"
    assert registrable(ex, "dev.api.staging.example.org") == "example.org"
