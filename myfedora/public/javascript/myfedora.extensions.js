var _extensions = function(){};

_extensions.prototype = {
    _extension_cache: {},
    _extension_deferred: {},
    _extension_uid_counter: 0,
        
    grep_extensions: function()
      {
        var extension_points = jQuery('script[type=text/x-myfedora-extpoint]');
        extension_points.each
          (
            function(i)
              {
                var ep = extension_points[i]
                var data = ep.text;
                data = myfedora.safe_json_parse(data);
                myfedora.extensions.load_extensions(data);
              }                 
          );
      },
    load_ui: function(ui, js)
      {
        id = js.placeholder_id;
        ui = eval("new myfedora.ui." + ui + "('" + id + "')");
        ui.set_show_effect(js.show_effect);
        ui.set_hide_effect(js.hide_effect);
      },
    run_extensions: function (js, data)
      {
      
        if (!js)
          {
            return;
          }
      
        var obj_list = js;
        
        var append_div = jQuery("#" + data.placeholder_id);
        
        var block_element;
        if (append_div.is('ul') ||
            append_div.is('ol'))
          {
            block_element = jQuery('<li/>')
          }
        else
          {
            block_element = jQuery('<div/>')
          }
          
        for(var i = 0; i < obj_list.length; i++) {
          //clone our data and generate our uid so we are unique
          var d = new myfedora.shallow_clone(data);
          d.uid = "extension_" + this._extension_uid_counter + 
            "_" + (Math.floor(Math.random() * 10000000));
          this._extension_uid_counter++;
            
          //create a place to put this extension that they can call their own
          var div = block_element.attr("id", d.uid);
          
          append_div.append(div);
          
          //run the script and parse in the results
          var result = obj_list[i].run(d);
          if (!result)
            {
              return;
            }
            
          div.append(result);
          
          //show it
          if (!data.ui) {
            if (data.show_effect) {
              eval("append_div." + data.show_effect);
            } else {
              div.show();
            }
          }
          
        }
       
      },
    
    load_extensions: function (data) 
      {
        var ext_code = this._extension_cache[data.type];
        var ext_deferred = this._extension_deferred[data.type];
        
        /* prep ui if this extention point is a ui element */
        var use_ui = data.ui;
        
        if (use_ui)
          {
            this.load_ui(use_ui, data);
          }
        
        /* run the code if it is in our cache */
        if (ext_code)
          {
            this.run_extensions(ext_code, data);
            return; 
          }
        else if (ext_deferred)
          { 
            this._extension_deferred[data.type].push(data);
            return;
          }
        
        this._extension_deferred[data.type] = new Array();
        jQuery.get("/extensions?exttype=" + data.type, 
          function (js_string, err)
            {
              // we trust the server so we can just eval the js
              // it should be a list of objects with a run method
              var js = eval(js_string);
              
              // run this callback's extention
              myfedora.extensions.run_extensions(js, data);
              
              // now run the deferred extensions queued up while the scripts
              // were being downloaded
              var d = myfedora.extensions._extension_deferred[data.type].shift();
              while(d)
                {
                  myfedora.extensions.run_extensions(js, d);
                  d = myfedora.extensions._extension_deferred[data.type].shift();
                }
                
              myfedora.extensions._extension_cache[data.type] = js;
            } 
         );
      }
};

myfedora.extensions = new _extensions();

jQuery(document).ready(myfedora.extensions.grep_extensions)