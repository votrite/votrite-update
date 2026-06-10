@extends('client.layout.client')

@section('content')

<div style="display: table; position: absolute; top: 0; left: 0; height: 100%; width: 100%; background: #E0E5EC;">
    <div style="display: table-cell; vertical-align: middle;">
      <div class="text-center" style="margin-left: auto; margin-right: auto; width: 100%;">
      	<img src="{{asset('assets/img/ic_finish.png')}}" style="color: white;" />
        <h1 class="cast-text" data-a11y-heading tabindex="-1" style="color: #7b6be2; font-size: 50px;" role="status">You are Voted</h1>
      </div>
    </div>
</div>

@endsection
@section('script')
<script>
  setTimeout(function(){
    window.location.href = "{{url('/')}}";
  }, 5000);
</script>
@endsection