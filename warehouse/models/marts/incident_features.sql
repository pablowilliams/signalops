{{ config(materialized='table') }}

with lagged as (
    select
        *,
        lag(requests, 168) over entity_time as requests_same_hour_last_week,
        lag(error_rate, 168) over entity_time as error_rate_same_hour_last_week,
        lag(latency_p95_ms, 168) over entity_time as latency_same_hour_last_week,
        lag(revenue, 168) over entity_time as revenue_same_hour_last_week,
        avg(requests) over entity_history as requests_trailing_mean,
        stddev_samp(requests) over entity_history as requests_trailing_stddev
    from {{ ref('fct_service_health_hourly') }}
    window
        entity_time as (partition by service, region order by observed_at),
        entity_history as (
            partition by service, region order by observed_at
            rows between 168 preceding and 1 preceding
        )
)
select
    *,
    (requests - requests_trailing_mean) / nullif(requests_trailing_stddev, 0) as requests_trailing_zscore
from lagged
