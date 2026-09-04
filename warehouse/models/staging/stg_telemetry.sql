with ranked as (
    select
        cast(event_id as varchar) as event_id,
        cast(timestamp as timestamp) as observed_at,
        lower(trim(service)) as service,
        lower(trim(region)) as region,
        cast(deployment_version as varchar) as deployment_version,
        greatest(cast(requests as double), 0) as requests,
        least(greatest(cast(error_rate as double), 0), 1) as error_rate,
        greatest(cast(latency_p95_ms as double), 0) as latency_p95_ms,
        greatest(cast(revenue as double), 0) as revenue,
        cast(ingested_at as timestamp) as ingested_at,
        row_number() over (partition by event_id order by ingested_at desc) as recency_rank
    from {{ source('raw', 'telemetry') }}
)
select * exclude (recency_rank)
from ranked
where recency_rank = 1
