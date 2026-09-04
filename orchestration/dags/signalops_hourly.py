"""Reference Airflow DAG; tasks are idempotent by hourly data interval."""
from datetime import datetime, timedelta

from airflow.decorators import dag, task
from airflow.providers.standard.operators.bash import BashOperator


@dag(
    dag_id="signalops_hourly",
    start_date=datetime(2025, 1, 1),
    schedule="15 * * * *",
    catchup=True,
    max_active_runs=2,
    default_args={"retries": 2, "retry_delay": timedelta(minutes=5)},
    tags=["data-quality", "incident-intelligence"],
)
def signalops_hourly():
    @task
    def ingestion_partition(data_interval_start=None) -> str:
        return data_interval_start.strftime("%Y-%m-%dT%H:00:00Z")

    partition = ingestion_partition()
    contract = BashOperator(task_id="validate_contract", bash_command="python -m signalops.contracts --partition '{{ ti.xcom_pull(task_ids=\"ingestion_partition\") }}'")
    dbt_build = BashOperator(task_id="build_hourly_mart", bash_command="dbt build --project-dir warehouse --select +fct_service_health_hourly")
    detect = BashOperator(task_id="detect_and_diagnose", bash_command="python -m signalops.jobs.detect --partition '{{ data_interval_start }}'")
    publish = BashOperator(task_id="publish_incidents", bash_command="python -m signalops.jobs.publish --partition '{{ data_interval_start }}'")
    partition >> contract >> dbt_build >> detect >> publish


signalops_hourly()
