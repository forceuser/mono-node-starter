import {h} from "vue";


const Wrapper = (props, context) => {
	return props.wrap
		? h(props.wrap, context.attrs, context.slots)
		: [...Object.values(context.slots).map((slot) => slot())];
};

Wrapper.props = ["wrap"];
Wrapper.inheritAttrs = false;

export default Wrapper;
