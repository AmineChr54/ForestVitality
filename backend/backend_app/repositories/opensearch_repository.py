# backend_app/repositories/opensearch_repository.py

from opensearchpy import OpenSearch
import os


def get_client() -> OpenSearch:
    """
    Create an OpenSearch client using environment variables.
    """
    host = os.getenv("OPENSEARCH_HOST", "localhost")
    port = int(os.getenv("OPENSEARCH_PORT", "9200"))
    use_ssl = os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true"
    
    return OpenSearch(
        hosts=[{"host": host, "port": port}],
        use_ssl=use_ssl,
        verify_certs=False,  # Disable cert verification for self-signed certs
    )

