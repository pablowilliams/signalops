{{ config(unique_key=['observed_at', 'service', 'region']) }}

select
    observed_at,
    service,
    region,
    max_by(deployment_version, ingested_at) as deployment_version,
    sum(requests) as requests,
    sum(revenue) as revenue,
    sum(error_rate * requests) / nullif(sum(requests), 0) as error_rate,
    max(latency_p95_ms) as latency_p95_ms,
    max(ingested_at) as last_ingested_at
from {{ ref('stg_telemetry') }}
{% if is_incremental() %}
where observed_at >= (select coalesce(max(observed_at), timestamp '1970-01-01') - interval '7 day' from {{ this }})
{% endif %}
group by 1, 2, 3
