let roiApp = null;
(function(Vue) {
    'use strict';

    const { createApp, ref, reactive, onMounted, computed } = Vue;
    const intervals = {};
    let locale = 'nl-nl';

    function DigitCounter(el, name, options) {
        this.el = el;
        this.name = name;
        this.options = Object.assign(
            {
                duration: 1000,
                steps: 20,
                prec: 1,
                format: '{nr}',
            },
            options,
        );
        this.el.innerHTML = this.options.format.replace('{nr}', '0');
    }

    DigitCounter.prototype.count = function(start, stop) {
        const incr = (stop - start) / this.options.steps;
        const prec = this.options.prec;
        this.el.innerHTML = this.options.format.replace(
            '{nr}',
            start.toLocaleString(locale),
        );
        intervals[this.name] = setInterval(() => {
            start += incr;
            if (start > stop) {
                this.el.innerHTML = this.options.format.replace(
                    '{nr}',
                    stop.toLocaleString(locale),
                );
                return clearInterval(intervals[this.name]);
            }
            this.el.innerHTML = this.options.format.replace(
                '{nr}',
                (Math.round(start * prec) / prec).toLocaleString(locale),
            );
        }, Math.round(this.options.duration / this.options.steps));
    };

    const defaultState = {
        number_machines: 1,
        nr_liter: 750,
        costs_liter: 2.5,
        operating_hours: 5000,
        machine_cost: 50,
        labour_cost: 40,
        machine_availability: 93,
        electric_faults_factor: 0.65,
        hydr_faults_factor: 0.35,
        fluid_factor: 0.8,
        fluid_service_factor: 0.2,
        oil_savings_factor: 0.9,
    };

    const digitCounters = {
        total_savings: {},
        co2_reduction: {},
        round_the_world: {},
    };

    function setupCounters(els) {
        digitCounters.total_savings = new DigitCounter(
            els.total_savings_counter.value,
            'total_savings',
            { duration: 1000, format: '€ {nr}' },
        );
        digitCounters.co2_reduction = new DigitCounter(
            els.co2_reduction_counter.value,
            'co2_reduction',
            { duration: 1000, steps: 50, prec: 10 },
        );
        digitCounters.round_the_world = new DigitCounter(
            els.round_the_world_counter.value,
            'round_the_world',
            { duration: 1000, steps: 100, prec: 10 },
        );
    }

    const barsInit = {
        total_old_style: 'height: 0',
        total_new_style: 'height: 0',
        total_costs_old_graph: 0,
        total_costs_new_graph: 0,
    };

    function showBars(bars, computedProps) {
        const height = 220;
        bars.total_old_style = 'height: ' + height + 'px';
        bars.total_costs_old_graph = computedProps.total_costs_old.value;
        bars.total_new_style =
            'height: ' +
            Math.round(
                (1 -
                    (computedProps.total_costs_old.value - computedProps.total_remaining.value) /
                    computedProps.total_costs_old.value) *
                height,
            ) +
            'px';
        bars.total_costs_new_graph = computedProps.total_remaining.value;
    }

    const getComputedProps = state => {
        const machine_unavailability = computed(() => {
            return 100 - state.machine_availability;
        });
        const downtime_hours = computed(() => {
            return Math.round(
                state.number_machines *
                state.operating_hours *
                (machine_unavailability.value / 100),
            );
        });
        const mechelec_faults = computed(() => {
            return Math.round(downtime_hours.value * state.electric_faults_factor);
        });
        const hydr_faults = computed(() => {
            return Math.round(downtime_hours.value * state.hydr_faults_factor);
        });
        const by_fluid = computed(() => {
            return Math.round(hydr_faults.value * state.fluid_factor);
        });
        const fluid_related_downtime_costs = computed(() => {
            return by_fluid.value * state.machine_cost;
        });
        const labour_cost_for_repair = computed(() => {
            return by_fluid.value * state.labour_cost;
        });
        const total_maintenance_cost = computed(() => {
            return fluid_related_downtime_costs.value + labour_cost_for_repair.value;
        });
        const remaining_downtime_hours = computed(() => {
            return Math.round(by_fluid.value * state.fluid_service_factor);
        });
        const reduction_in_downtime_cost = computed(() => {
            return Math.round(
                fluid_related_downtime_costs.value * state.fluid_service_factor,
            );
        });
        const reduction_in_labour_cost = computed(() => {
            return labour_cost_for_repair.value * state.fluid_service_factor;
        });
        const total_remaining = computed(() => {
            return reduction_in_downtime_cost.value + reduction_in_labour_cost.value;
        });
        const machine_savings = computed(() => {
            return total_maintenance_cost.value - total_remaining.value;
        });
        const oil_savings = computed(() => {
            return Math.round(
                state.nr_liter * state.costs_liter * state.oil_savings_factor,
            );
        });
        const total_savings = computed(() => {
            return machine_savings.value + oil_savings.value;
        });
        const total_costs_old = computed(() => {
            return total_maintenance_cost.value + oil_savings.value;
        });
        const co2_reduction = computed(() => {
            return (
                Math.round((state.nr_liter * state.oil_savings_factor * 2.6) / 100) / 10
            );
        });
        const round_the_world = computed(() => {
            return Math.round((co2_reduction.value * 1000000) / 215 / 4007.5) / 10;
        });
        return {
            machine_unavailability,
            downtime_hours,
            mechelec_faults,
            hydr_faults,
            by_fluid,
            fluid_related_downtime_costs,
            labour_cost_for_repair,
            total_maintenance_cost,
            remaining_downtime_hours,
            reduction_in_downtime_cost,
            reduction_in_labour_cost,
            machine_savings,
            oil_savings,
            total_savings,
            total_remaining,
            total_costs_old,
            co2_reduction,
            round_the_world,
        };
    };

    const app = {
        name: 'Besparing',

        setup() {
            const total_savings_counter = ref(null);
            const co2_reduction_counter = ref(null);
            const round_the_world_counter = ref(null);
            const state = reactive(defaultState);
            const computedProps = getComputedProps(state);
            const bars = reactive(barsInit);

            const resultsAreSet = () => {
                return bars.total_costs_new_graph > 0;
            };
            // const resultsAreSet = () => computedProps.total_savings.value > 0;
            const showResult = () => {
                showBars(bars, computedProps);
                digitCounters.total_savings.count(0, computedProps.total_savings.value);
                digitCounters.co2_reduction.count(0, computedProps.co2_reduction.value);
                digitCounters.round_the_world.count(0, computedProps.round_the_world.value);
            };
            const numberFormat = val => {
                return val.toLocaleString(locale);
            };
            const currency = val => {
                return '€ ' + val.toLocaleString(locale);
            };

            onMounted(() => {
                locale = document.documentElement.lang;
                setupCounters({
                    total_savings_counter,
                    co2_reduction_counter,
                    round_the_world_counter,
                });
            });
            return {
                state,
                bars,
                ...computedProps,
                showResult,
                numberFormat,
                currency,
                total_savings_counter,
                co2_reduction_counter,
                round_the_world_counter,
                resultsAreSet,
            };
        },
    };
    roiApp = createApp(app).mount('#roi-form');
})(Vue);
