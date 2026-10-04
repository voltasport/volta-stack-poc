import {redirect} from 'react-router';

export function loader() {
  return redirect('/portal');
}

export default function Index() {
  return null;
}
